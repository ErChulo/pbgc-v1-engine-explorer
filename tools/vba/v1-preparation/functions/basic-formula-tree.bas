Public Function BasicFormulaTree(f) As String
   
    Dim formulaStr As String

                If IsObject(f) Then
                    Debug.Assert TypeOf f Is Range
           
                    Dim rng As Range
                    Set rng = f
           
                    formulaStr = rng.Formula
                Else
                    Debug.Assert VarType(f) = vbString
           
                    formulaStr = f
                End If

    Dim tabs(0 To 99) As Long

    Dim tabNum As Long
    tabNum = 1

    Dim tabOffset As Long

    Dim i As Long
    Dim c As String
    For i = 1 To Len(formulaStr)
        c = Mid$(formulaStr, i, 1)

        If InStr("({", c) > 0 Then
            BasicFormulaTree = BasicFormulaTree & c

            tabNum = tabNum + 1
            tabs(tabNum) = tabs(tabNum - 1) + tabOffset + 1
            tabOffset = 0

            BasicFormulaTree = BasicFormulaTree & vbCrLf & Space(tabs(tabNum))
        ElseIf InStr(")}", c) > 0 Then
            tabNum = tabNum - 1
            tabOffset = 0

            BasicFormulaTree = BasicFormulaTree & c & vbCrLf & Space(tabs(tabNum))
        ElseIf InStr("+-*/^,;", c) > 0 Then
            tabOffset = 0

            BasicFormulaTree = BasicFormulaTree & c & vbCrLf & Space(tabs(tabNum))
        Else
            BasicFormulaTree = BasicFormulaTree & c

            tabOffset = tabOffset + 1
        End If
    Next i
End Function