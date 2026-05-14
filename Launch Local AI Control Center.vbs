Set shell = CreateObject("WScript.Shell")
folder = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
command = "cmd /c cd /d """ & folder & """ && if not exist node_modules call npm.cmd install && call npm.cmd run dev"
shell.Run command, 0, False
