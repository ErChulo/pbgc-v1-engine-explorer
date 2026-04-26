'De la hoja anfitriona del procedimiento
Sub ListFormulas()

Dim Rng As Range
Dim WorkRng As Range
Dim xSheet As Worksheet
Dim xRow As Integer
xTitleId = "Lista de Formulas"
Set WorkRng = Application.Selection
Set WorkRng = Application.InputBox("Range", xTitleId, WorkRng.Address, Type:=8)
Set WorkRng = WorkRng.SpecialCells(xlFormulas, 23)
If WorkRng Is Nothing Then Exit Sub
Application.ScreenUpdating = False
Set xSheet = Application.ActiveWorkbook.Worksheets.Add
xSheet.Range("A1:C1") = Array("Address", "Formula", "Value")
xSheet.Range("A1:C1").Font.Bold = True
xRow = 2
For Each Rng In WorkRng
    xSheet.Cells(xRow, 1) = Rng.Address(RowAbsolute:=False, ColumnAbsolute:=False)
    xSheet.Cells(xRow, 2) = " " & Rng.Formula
    xSheet.Cells(xRow, 3) = Rng.Value
    xRow = xRow + 1
Next
xSheet.Columns("A:C").AutoFit
Application.ScreenUpdating = True
End Sub