Function GetNameRefersTo(TheName As String) As String
    Dim S As String
    Dim HasRef As Boolean
    Dim R As Range
    Dim NM As Name
    Set NM = ThisWorkbook.Names(TheName)
    On Error Resume Next
    Set R = NM.RefersToRange
    If Err.Number = 0 Then
        HasRef = True
    Else
        HasRef = False
    End If
    If HasRef = True Then
        S = R.Text
    Else
        S = NM.RefersTo
        If StrComp(Mid(S, 2, 1), Chr(34), vbBinaryCompare) = 0 Then
            ' text constant
            S = Mid(S, 3, Len(S) - 3)
        Else
            ' numeric contant
            S = Mid(S, 2)
        End If
    End If
    GetNameRefersTo = S
End Function