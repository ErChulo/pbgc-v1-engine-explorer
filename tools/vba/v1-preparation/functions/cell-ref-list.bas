Public Function CellReflist(Optional r As Range)  ' single cell
Dim result As Object: Dim testExpression As String: Dim objRegEx As Object
If r Is Nothing Then Set r = ActiveCell ' Cells(1, 2)  ' INPUT THE CELL HERE , e.g.    RANGE("A1")
Set objRegEx = CreateObject("VBScript.RegExp")
objRegEx.IgnoreCase = True: objRegEx.Global = True: objRegEx.Pattern = """.*?"""    ' remove expressions
testExpression = CStr(r.Formula)
testExpression = objRegEx.Replace(testExpression, "")
'objRegEx.Pattern = "(([A-Z])+(\d)+)"  'grab the address
'TRATAR CON \b[A-Z]{1,3}[0-9]{1,7}\b
objRegEx.Pattern = "(['\[].*?['!])?([[A-Z0-9_]+[!])?(\$?[A-Z]+\$?(\d)+(:\$?[A-Z]+\$?(\d)+)?|\$?[A-Z]+:\$?[A-Z]+|(\$?[A-Z]+\$?(\d)+))"
If objRegEx.Test(testExpression) Then
    Set result = objRegEx.Execute(testExpression)
    If result.Count > 0 Then CellReflist = result(0).Value
    If result.Count > 1 Then
        For i = 1 To result.Count - 1 'Each Match In result
            dbl = False ' poistetaan tuplaesiintymiset
            For j = 0 To i - 1
                If result(i).Value = result(j).Value Then dbl = True
            Next j
            If Not dbl Then CellReflist = CellReflist & "," & result(i).Value 'Match.Value
        Next i 'Match
    End If
End If
End Function