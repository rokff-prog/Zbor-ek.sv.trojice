using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace SkupnaPesmarica
{
    public static class Program
    {
        [STAThread]
        public static int Main(string[] args)
        {
            string configuredRoot = Environment.GetEnvironmentVariable("EPESMARICAS_ROOT");
            string root = String.IsNullOrEmpty(configuredRoot)
                ? AppDomain.CurrentDomain.BaseDirectory
                : Path.GetFullPath(configuredRoot);

            try
            {
                PlayerFiles files = PlayerFiles.Find(root);
                SongCatalog ourSongs = SongCatalog.Load(files.OurCatalog, files.OurSongDirectory, files.DropSongDirectory);
                LegacyCatalog oldSongs = new LegacyCatalog(files.LegacySongDirectory);

                if (args != null && args.Length > 0 && String.Equals(args[0], "--self-test", StringComparison.OrdinalIgnoreCase))
                    return SelfTest(ourSongs, oldSongs);
                if (args != null && args.Length > 0 && String.Equals(args[0], "--input-self-test", StringComparison.OrdinalIgnoreCase))
                    return InputSelfTest(ourSongs, oldSongs);

                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                using (PlayerContext context = new PlayerContext(ourSongs, oldSongs))
                    Application.Run(context);
                return 0;
            }
            catch (Exception ex)
            {
                if (args != null && args.Length > 0)
                    Console.Error.WriteLine("NAPAKA: " + ex.Message);
                else
                    MessageBox.Show(ex.Message, "E-pesmaricaS", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
        }

        private static int SelfTest(SongCatalog ourSongs, LegacyCatalog oldSongs)
        {
            string oldTitle;
            string oldLyrics;
            if (!oldSongs.TryLoad("53", out oldTitle, out oldLyrics) || oldTitle.Length == 0 || oldLyrics.Length == 0)
                throw new InvalidDataException("Stare pesmi št. 53 ni mogoče pravilno prebrati.");

            int pageCount = 0;
            foreach (List<string> pages in ourSongs.Pages.Values)
            {
                foreach (string path in pages)
                {
                    using (Image image = Image.FromFile(path))
                    {
                        if (image.Width < 1 || image.Height < 1)
                            throw new InvalidDataException("Neveljavna slika: " + path);
                    }
                    pageCount++;
                }
            }

            Console.WriteLine(
                "OK: {0} starih pesmi, {1} naših številk, {2} veljavnih strani",
                oldSongs.Count,
                ourSongs.Pages.Count,
                pageCount);
            return 0;
        }

        private static int InputSelfTest(SongCatalog ourSongs, LegacyCatalog oldSongs)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            using (PlayerContext context = new PlayerContext(ourSongs, oldSongs, false))
            {
                context.TestKey(Keys.D1);
                context.TestKey(Keys.Enter);
                if (context.TestMode != "lyrics")
                    throw new InvalidOperationException("Vnos 1 nato Enter ni odprl stare pesmi.");

                context.TestKey(Keys.D1);
                context.TestKey(Keys.Add);
                if (context.TestMode != "image")
                    throw new InvalidOperationException("Vnos 1 + ni odprl naše pesmi.");
            }
            Console.WriteLine("OK: 1 nato Enter odpre staro, 1 nato + odpre našo pesem");
            return 0;
        }
    }

    internal sealed class PlayerFiles
    {
        public string OurSongDirectory;
        public string OurCatalog;
        public string DropSongDirectory;
        public string LegacySongDirectory;

        public static PlayerFiles Find(string root)
        {
            PlayerFiles files = new PlayerFiles();
            files.OurSongDirectory = Path.Combine(root, "predvajalnik-pesmi");
            files.OurCatalog = Path.Combine(files.OurSongDirectory, "katalog.tsv");
            files.DropSongDirectory = Path.Combine(root, "dodane-pesmi");

            string parent = Path.GetFullPath(Path.Combine(root, ".."));
            string[] candidates = new string[]
            {
                Path.Combine(root, "stara-pesmarica"),
                Path.Combine(parent, "pesmarica", "Projekcija"),
                Path.Combine(root, "pesmarica", "Projekcija")
            };
            foreach (string candidate in candidates)
            {
                if (Directory.Exists(candidate) && Directory.GetFiles(candidate, "*.txt").Length > 0)
                {
                    files.LegacySongDirectory = candidate;
                    break;
                }
            }

            if (!File.Exists(files.OurCatalog))
                throw new FileNotFoundException("Manjka katalog naših pesmi.", files.OurCatalog);
            if (files.LegacySongDirectory == null)
                throw new DirectoryNotFoundException("Manjka mapa s starimi pesmimi.");
            Directory.CreateDirectory(files.DropSongDirectory);
            return files;
        }
    }

    internal sealed class SongCatalog
    {
        public readonly Dictionary<string, List<string>> Pages = new Dictionary<string, List<string>>();

        public static SongCatalog Load(string catalogPath, string songDirectory, string dropSongDirectory)
        {
            SongCatalog catalog = new SongCatalog();
            foreach (string rawLine in File.ReadAllLines(catalogPath, Encoding.UTF8))
            {
                string line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith("#")) continue;
                string[] parts = line.Split('\t');
                if (parts.Length < 2) continue;

                string number = NormalizeNumber(parts[0]);
                string pagePath = Path.Combine(songDirectory, parts[1].Trim());
                if (number.Length == 0 || !File.Exists(pagePath)) continue;

                List<string> pages;
                if (!catalog.Pages.TryGetValue(number, out pages))
                {
                    pages = new List<string>();
                    catalog.Pages.Add(number, pages);
                }
                pages.Add(pagePath);
            }
            catalog.ApplyDroppedPages(dropSongDirectory);
            if (catalog.Pages.Count == 0)
                throw new InvalidDataException("V katalogu ni nobene veljavne naše pesmi.");
            return catalog;
        }

        private void ApplyDroppedPages(string directory)
        {
            if (!Directory.Exists(directory)) return;

            Dictionary<string, string> newestFiles = new Dictionary<string, string>();
            foreach (string path in Directory.GetFiles(directory, "pesem-*.*"))
            {
                string extension = Path.GetExtension(path).ToLowerInvariant();
                if (extension != ".jpg" && extension != ".jpeg" && extension != ".png") continue;

                string name = Path.GetFileNameWithoutExtension(path);
                string[] parts = name.Split('-');
                if (parts.Length < 2 || parts.Length > 3 || !String.Equals(parts[0], "pesem", StringComparison.OrdinalIgnoreCase)) continue;

                string number = NormalizeNumber(parts[1]);
                int pageNumber = 1;
                if (number.Length == 0 || (parts.Length == 3 && (!Int32.TryParse(parts[2], out pageNumber) || pageNumber < 1))) continue;

                string key = number + ":" + pageNumber.ToString();
                string current;
                if (!newestFiles.TryGetValue(key, out current)
                    || File.GetLastWriteTimeUtc(path) > File.GetLastWriteTimeUtc(current))
                    newestFiles[key] = path;
            }

            List<string> keys = new List<string>(newestFiles.Keys);
            keys.Sort(CompareDroppedPageKeys);
            foreach (string key in keys)
            {
                string[] values = key.Split(':');
                string number = values[0];
                int pageNumber = Int32.Parse(values[1]);
                List<string> pages;
                if (!Pages.TryGetValue(number, out pages))
                {
                    pages = new List<string>();
                    Pages.Add(number, pages);
                }
                if (pageNumber <= pages.Count) pages[pageNumber - 1] = newestFiles[key];
                else pages.Add(newestFiles[key]);
            }
        }

        private static int CompareDroppedPageKeys(string left, string right)
        {
            string[] a = left.Split(':');
            string[] b = right.Split(':');
            int numberOrder = Int32.Parse(a[0]).CompareTo(Int32.Parse(b[0]));
            return numberOrder != 0 ? numberOrder : Int32.Parse(a[1]).CompareTo(Int32.Parse(b[1]));
        }

        public static string NormalizeNumber(string value)
        {
            int number;
            if (!Int32.TryParse(value.Trim(), out number) || number < 0) return String.Empty;
            return number.ToString();
        }
    }

    internal sealed class LegacyCatalog
    {
        private readonly string directory;
        public int Count { get; private set; }

        public LegacyCatalog(string path)
        {
            directory = path;
            Count = Directory.GetFiles(directory, "*.txt").Length;
            if (Count == 0) throw new InvalidDataException("Mapa s starimi pesmimi je prazna.");
        }

        public bool TryLoad(string number, out string title, out string lyrics)
        {
            title = String.Empty;
            lyrics = String.Empty;
            int value;
            if (!Int32.TryParse(number, out value)) return false;
            string path = Path.Combine(directory, value.ToString("0000") + ".txt");
            if (!File.Exists(path)) return false;

            string text = ReadText(path).Replace("\r\n", "\n").Replace('\r', '\n').Trim();
            string[] lines = text.Split('\n');
            if (lines.Length == 0) return false;
            title = lines[0].Trim();
            lyrics = lines.Length > 1 ? String.Join("\n", lines, 1, lines.Length - 1).Trim() : title;
            return true;
        }

        private static string ReadText(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            try
            {
                return new UTF8Encoding(false, true).GetString(bytes);
            }
            catch (DecoderFallbackException)
            {
                return Encoding.GetEncoding(1250).GetString(bytes);
            }
        }
    }

    internal sealed class PlayerContext : ApplicationContext, IDisposable
    {
        private readonly SongCatalog ourSongs;
        private readonly LegacyCatalog oldSongs;
        private readonly PlayerWindow player;
        private bool prefixMode;
        private string prefixSign = "-";
        private string typedNumber = String.Empty;
        private string activeOurNumber = String.Empty;
        private int activeOurPage;
        private DateTime lastEscape = DateTime.MinValue;

        public PlayerContext(SongCatalog ourCatalog, LegacyCatalog legacyCatalog)
            : this(ourCatalog, legacyCatalog, true)
        {
        }

        internal PlayerContext(SongCatalog ourCatalog, LegacyCatalog legacyCatalog, bool showWindow)
        {
            ourSongs = ourCatalog;
            oldSongs = legacyCatalog;
            player = new PlayerWindow();
            MainForm = player;
            player.KeyDown += HandleKeyDown;
            player.FormClosed += delegate { ExitThread(); };
            if (showWindow)
            {
                player.Show();
                player.Activate();
            }
        }

        internal string TestMode { get { return player.Mode; } }

        internal void TestKey(Keys key)
        {
            HandleKeyDown(player, new KeyEventArgs(key));
        }

        private void HandleKeyDown(object sender, KeyEventArgs e)
        {
            int digit = DigitFromKey(e.KeyCode);
            if (IsPrefixKey(e.KeyCode))
            {
                prefixSign = e.KeyCode == Keys.Add || e.KeyCode == Keys.Oemplus ? "+" : "-";
                if (!prefixMode && typedNumber.Length > 0)
                {
                    OpenOurSong();
                }
                else
                {
                    prefixMode = true;
                    typedNumber = String.Empty;
                    UpdateNumberWindow();
                }
                Consume(e);
                return;
            }

            if (digit >= 0)
            {
                if (!prefixMode && player.HasContent) player.ShowBlank();
                if (typedNumber.Length < 4) typedNumber += digit.ToString();
                UpdateNumberWindow();
                Consume(e);
                return;
            }

            if (e.KeyCode == Keys.Back)
            {
                if (typedNumber.Length > 0) typedNumber = typedNumber.Substring(0, typedNumber.Length - 1);
                UpdateNumberWindow();
                Consume(e);
                return;
            }

            if (e.KeyCode == Keys.Enter)
            {
                if (prefixMode) OpenOurSong(); else OpenOldSong();
                Consume(e);
                return;
            }

            if (e.KeyCode == Keys.Right || e.KeyCode == Keys.PageDown || e.KeyCode == Keys.Space)
            {
                ChangePage(1);
                Consume(e);
                return;
            }
            if (e.KeyCode == Keys.Left || e.KeyCode == Keys.PageUp)
            {
                ChangePage(-1);
                Consume(e);
                return;
            }

            if (e.KeyCode == Keys.Escape)
            {
                DateTime now = DateTime.Now;
                if ((now - lastEscape).TotalMilliseconds <= 900)
                {
                    player.Close();
                }
                else
                {
                    lastEscape = now;
                    ClearInput();
                    player.ShowBlank();
                }
                Consume(e);
            }
        }

        private void OpenOldSong()
        {
            string number = SongCatalog.NormalizeNumber(typedNumber);
            string title;
            string lyrics;
            if (number.Length == 0 || !oldSongs.TryLoad(number, out title, out lyrics))
            {
                System.Media.SystemSounds.Exclamation.Play();
                return;
            }
            ClearInput();
            activeOurNumber = String.Empty;
            player.ShowLyrics(title, lyrics);
        }

        private void OpenOurSong()
        {
            string number = SongCatalog.NormalizeNumber(typedNumber);
            List<string> pages;
            if (number.Length == 0 || !ourSongs.Pages.TryGetValue(number, out pages))
            {
                System.Media.SystemSounds.Exclamation.Play();
                return;
            }
            ClearInput();
            activeOurNumber = number;
            activeOurPage = 0;
            player.ShowImage(pages[0]);
        }

        private void ChangePage(int direction)
        {
            if (activeOurNumber.Length > 0)
            {
                List<string> pages = ourSongs.Pages[activeOurNumber];
                int next = activeOurPage + direction;
                if (next < 0 || next >= pages.Count) return;
                activeOurPage = next;
                player.ShowImage(pages[activeOurPage]);
            }
            else
            {
                player.ChangeLyricsPage(direction);
            }
        }

        private void ClearInput()
        {
            prefixMode = false;
            typedNumber = String.Empty;
            player.HideNumber();
        }

        private void UpdateNumberWindow()
        {
            string value = prefixMode ? prefixSign + typedNumber : typedNumber;
            if (value.Length == 0) player.HideNumber(); else player.DisplayNumber(value);
        }

        private static bool IsPrefixKey(Keys key)
        {
            return key == Keys.Add || key == Keys.Oemplus || key == Keys.Subtract || key == Keys.OemMinus;
        }

        private static int DigitFromKey(Keys key)
        {
            if (key >= Keys.D0 && key <= Keys.D9) return key - Keys.D0;
            if (key >= Keys.NumPad0 && key <= Keys.NumPad9) return key - Keys.NumPad0;
            return -1;
        }

        private static void Consume(KeyEventArgs e)
        {
            e.Handled = true;
            e.SuppressKeyPress = true;
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                player.Dispose();
            }
            base.Dispose(disposing);
        }
    }

    internal sealed class PlayerWindow : Form
    {
        private readonly PictureBox picture;
        private readonly LyricsView lyrics;
        private readonly Label numberLabel;
        private Image currentImage;
        private string mode = "blank";
        public bool HasContent { get { return picture.Visible || lyrics.Visible; } }
        internal string Mode { get { return mode; } }

        public PlayerWindow()
        {
            Text = "E-pesmaricaS";
            FormBorderStyle = FormBorderStyle.None;
            WindowState = FormWindowState.Maximized;
            StartPosition = FormStartPosition.Manual;
            Bounds = Screen.PrimaryScreen.Bounds;
            BackColor = Color.Black;
            ForeColor = Color.White;
            TopMost = true;
            ShowInTaskbar = true;
            KeyPreview = true;

            picture = new PictureBox();
            picture.Dock = DockStyle.Fill;
            picture.BackColor = Color.Black;
            picture.SizeMode = PictureBoxSizeMode.Zoom;
            picture.Visible = false;

            lyrics = new LyricsView();
            lyrics.Dock = DockStyle.Fill;
            lyrics.Visible = false;

            numberLabel = new Label();
            numberLabel.Size = new Size(190, 68);
            numberLabel.Location = new Point(ClientSize.Width - numberLabel.Width - 20, 20);
            numberLabel.Anchor = AnchorStyles.Top | AnchorStyles.Right;
            numberLabel.BackColor = Color.White;
            numberLabel.ForeColor = Color.FromArgb(4, 53, 75);
            numberLabel.Font = new Font("Arial", 28, FontStyle.Bold);
            numberLabel.TextAlign = ContentAlignment.MiddleCenter;
            numberLabel.Visible = false;

            Controls.Add(picture);
            Controls.Add(lyrics);
            Controls.Add(numberLabel);
            Cursor.Hide();
        }

        public void ShowBlank()
        {
            picture.Visible = false;
            lyrics.Visible = false;
            mode = "blank";
            ReleaseImage();
            Invalidate();
        }

        public void ShowImage(string path)
        {
            byte[] bytes = File.ReadAllBytes(path);
            Image next;
            using (MemoryStream stream = new MemoryStream(bytes))
            using (Image source = Image.FromStream(stream))
                next = new Bitmap(source);
            ReleaseImage();
            currentImage = next;
            picture.Image = next;
            lyrics.Visible = false;
            picture.Visible = true;
            picture.BringToFront();
            mode = "image";
        }

        public void ShowLyrics(string title, string text)
        {
            ReleaseImage();
            picture.Visible = false;
            lyrics.SetSong(title, text);
            lyrics.Visible = true;
            lyrics.BringToFront();
            mode = "lyrics";
        }

        public void ChangeLyricsPage(int direction)
        {
            if (lyrics.Visible) lyrics.ChangePage(direction);
        }

        public void DisplayNumber(string value)
        {
            numberLabel.Text = value;
            numberLabel.Visible = true;
            numberLabel.BringToFront();
        }

        public void HideNumber()
        {
            numberLabel.Visible = false;
        }

        private void ReleaseImage()
        {
            picture.Image = null;
            if (currentImage != null)
            {
                currentImage.Dispose();
                currentImage = null;
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                ReleaseImage();
                Cursor.Show();
            }
            base.Dispose(disposing);
        }
    }

    internal sealed class LyricsView : Control
    {
        private readonly Font songFont = new Font("Microsoft Sans Serif", 36, FontStyle.Bold, GraphicsUnit.Point);
        private readonly List<List<string>> pages = new List<List<string>>();
        private string title = String.Empty;
        private string source = String.Empty;
        private int page;

        public LyricsView()
        {
            BackColor = Color.Black;
            ForeColor = Color.White;
            DoubleBuffered = true;
            Resize += delegate { BuildPages(); };
        }

        public void SetSong(string songTitle, string text)
        {
            title = songTitle;
            source = text;
            page = 0;
            BuildPages();
            Invalidate();
        }

        public void ChangePage(int direction)
        {
            int next = page + direction;
            if (next < 0 || next >= pages.Count) return;
            page = next;
            Invalidate();
        }

        private void BuildPages()
        {
            pages.Clear();
            if (source.Length == 0 || Width < 100 || Height < 100) return;

            int maxWidth = Math.Min(1200, Math.Max(400, Width - 80));
            int maxHeight = Math.Min(680, Math.Max(300, Height - 80));
            int lineHeight = songFont.Height + 8;
            int maxLines = Math.Max(3, maxHeight / lineHeight);
            List<string> allLines = new List<string>();

            using (Graphics graphics = CreateGraphics())
            {
                foreach (string raw in source.Replace("\r", String.Empty).Split('\n'))
                {
                    if (raw.Trim().Length == 0)
                    {
                        allLines.Add(String.Empty);
                        continue;
                    }
                    string remaining = raw.TrimEnd();
                    while (remaining.Length > 0)
                    {
                        int take = remaining.Length;
                        while (take > 1 && graphics.MeasureString(remaining.Substring(0, take), songFont).Width > maxWidth)
                        {
                            int space = remaining.LastIndexOf(' ', take - 1, take);
                            take = space > 0 ? space : take - 1;
                        }
                        allLines.Add(remaining.Substring(0, take).Trim());
                        remaining = remaining.Substring(take).TrimStart();
                    }
                }
            }

            for (int index = 0; index < allLines.Count; index += maxLines)
                pages.Add(allLines.GetRange(index, Math.Min(maxLines, allLines.Count - index)));
            if (pages.Count == 0) pages.Add(new List<string>());
            if (page >= pages.Count) page = pages.Count - 1;
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            if (pages.Count == 0) return;

            int areaWidth = Math.Min(1200, Width - 80);
            int areaHeight = Math.Min(680, Height - 80);
            int left = (Width - areaWidth) / 2 + 5;
            int top = (Height - areaHeight) / 2 + 50;
            int lineHeight = songFont.Height + 8;
            using (Brush brush = new SolidBrush(Color.White))
            {
                int y = top;
                foreach (string line in pages[page])
                {
                    e.Graphics.DrawString(line, songFont, brush, left, y);
                    y += lineHeight;
                }
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) songFont.Dispose();
            base.Dispose(disposing);
        }
    }

}
