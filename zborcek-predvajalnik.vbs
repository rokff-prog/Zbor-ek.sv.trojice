Option Explicit

Dim shell, fso, folder, url, edge, chrome
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
url = "file:///" & Replace(folder & "\usb-predvajalnik.html", "\", "/")

edge = shell.ExpandEnvironmentStrings("%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe")
chrome = shell.ExpandEnvironmentStrings("%ProgramFiles%\Google\Chrome\Application\chrome.exe")
If Not fso.FileExists(edge) Then edge = shell.ExpandEnvironmentStrings("%ProgramFiles%\Microsoft\Edge\Application\msedge.exe")
If Not fso.FileExists(chrome) Then chrome = shell.ExpandEnvironmentStrings("%LocalAppData%\Google\Chrome\Application\chrome.exe")
If Not fso.FileExists(edge) Then edge = shell.ExpandEnvironmentStrings("%LocalAppData%\Microsoft\Edge\Application\msedge.exe")

If fso.FileExists(edge) Then
  shell.Run Chr(34) & edge & Chr(34) & " --kiosk " & Chr(34) & url & Chr(34), 0, False
ElseIf fso.FileExists(chrome) Then
  shell.Run Chr(34) & chrome & Chr(34) & " --kiosk " & Chr(34) & url & Chr(34), 0, False
Else
  MsgBox "Na računalniku ni nameščen Microsoft Edge ali Google Chrome.", 48, "Predvajalnik pesmi"
End If
