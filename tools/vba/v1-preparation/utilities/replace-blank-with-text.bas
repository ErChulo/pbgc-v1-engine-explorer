Sub Replace_Blank_With_Text()
Dim Range1 As Range
Dim Value_1 As String
On Error Resume Next
Value_1 = InputBox("Replace with", "Replace Blank Cell")
For Each Range1 In Selection
If Range1.Text = "" Then Range1.Value = Value_1
    Next Range1
End Sub