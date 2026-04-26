'To extract the cell references from formulas, the below VBA code may do you a favor. Please do as follows:

'	1. Hold down the ALT + F11 keys to open the Microsoft Visual Basic for Applications window.

'	2. Click Insert > Module, and paste the following code in the Module Window.
'	3. After pasting the code, save the code and go back to the worksheet, and enter this formula: =extractcellrefs(G2)
'          (G2 is the cell which contains formula you want to extract the cell references) into a cell where you want to get the result, and then press Enter key.






Function ExtractCellRefs(Rg As Range) As String
'Updateby Extendoffice
    Dim xRetList As Object
    Dim xRegEx As Object
    Dim I As Long
    Dim xRet As String
    Application.Volatile
    Set xRegEx = CreateObject("VBSCRIPT.REGEXP")
    With xRegEx
        .Pattern = "('?[a-zA-Z0-9\s\[\]\.]{1,99})?'?!?\$?[A-Z]{1,3}\$?[0-9]{1,7}(:\$?[A-Z]{1,3}\$?[0-9]{1,7})?"
        .Global = True
        .MultiLine = True
        .IgnoreCase = False
    End With
    Set xRetList = xRegEx.Execute(Rg.Formula)
    If xRetList.Count > 0 Then
        For I = 0 To xRetList.Count - 1
            xRet = xRet & xRetList.Item(I) & ", "
        Next
        ExtractCellRefs = Left(xRet, Len(xRet) - 2)
    Else
        ExtractCellRefs = "No Matches"
    End If
End Function