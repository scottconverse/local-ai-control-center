Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
command = "cmd /c cd /d """ & folder & """ && powershell -ExecutionPolicy Bypass -File """ & folder & "\run-local-tests.ps1"""
exitCode = shell.Run(command, 0, True)
latest = folder & "\test-results\latest.log"
If fso.FileExists(latest) Then
  shell.Run "notepad.exe """ & latest & """", 1, False
End If
