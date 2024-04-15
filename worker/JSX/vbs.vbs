Dim appRef
Dim javaScriptFile
Dim argsArr()

Dim fsObj : Set fsObj = CreateObject("Scripting.FileSystemObject")
Dim jsxFile : Set jsxFile = fsObj.OpenTextFile("C:\projects\photoshop-worker\worker\JSX\jsx.jsx", 1, False)
Dim fileContents : fileContents = jsxFile.ReadAll
jsxFile.Close
Set jsxFile = Nothing
Set fsObj = Nothing

javascriptFile = fileContents & "main(arguments);"

Set appRef = CreateObject("Photoshop.Application")

ReDim argsArr(Wscript.Arguments.length-1)

For i = 0 To Wscript.Arguments.length-1
    argsArr(i) = Wscript.Arguments(i)
Next

Wscript.Echo appRef.DoJavaScript(javascriptFile, argsArr, 1)