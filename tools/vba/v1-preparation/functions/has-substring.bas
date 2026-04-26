Function HasSubstring(target As String, bullet As String) As Boolean
Dim temp As Boolean
temp = False
If Not (InStr(target, bullet) = 0) Then
temp = True
End If
HasSubstring = temp
End Function