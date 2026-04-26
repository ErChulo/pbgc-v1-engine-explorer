Sub Find_Links()

Dim wb As Workbook
Dim lnks As Variant, lnk As Variant

Dim i As Integer

 

Set wb = Application.ActiveWorkbook

lnks = wb.LinkSources(xlExcelLinks)

i = 1

 

If Not IsEmpty(lnks) Then

wb.Sheets.Add
ActiveSheet.Name = "Current Links"

For Each lnk In lnks

Application.ActiveSheet.Cells(i, 1).Value = lnk

i = i + 1

Next lnk

End If

End Sub