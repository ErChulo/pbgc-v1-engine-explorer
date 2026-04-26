Option Explicit

Public Const V1_ROW2_FORMULA_REPORT_SHEET As String = "V1_Row2_Formulas"

Public Sub ListAllRow2Formulas()

    Const SCAN_ROW As Long = 2
    Const INCLUDE_SHEETS_WITH_NO_ROW2_FORMULA As Boolean = True

    Dim wb As Workbook
    Dim ws As Worksheet
    Dim reportWs As Worksheet
    Dim formulaCells As Range
    Dim area As Range
    Dim c As Range

    Dim outRow As Long
    Dim formulaCount As Long
    Dim scannedSheetCount As Long

    Dim oldScreenUpdating As Boolean
    Dim oldEnableEvents As Boolean
    Dim oldDisplayAlerts As Boolean
    Dim oldStatusBar As Variant

    On Error GoTo Fail

    Set wb = ActiveWorkbook

    If wb Is Nothing Then
        Err.Raise vbObjectError + 1000, , "No active workbook found."
    End If

    oldScreenUpdating = Application.ScreenUpdating
    oldEnableEvents = Application.EnableEvents
    oldDisplayAlerts = Application.DisplayAlerts
    oldStatusBar = Application.StatusBar

    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.DisplayAlerts = False
    Application.StatusBar = "Creating V1 row-2 formula report..."

    DeleteWorksheetIfExists wb, V1_ROW2_FORMULA_REPORT_SHEET

    Set reportWs = wb.Worksheets.Add(After:=wb.Worksheets(wb.Worksheets.Count))
    reportWs.Name = V1_ROW2_FORMULA_REPORT_SHEET

    With reportWs
        .Range("A1").Value = "WorkbookName"
        .Range("B1").Value = "WorkbookFullName"
        .Range("C1").Value = "ScannedRow"
        .Range("D1").Value = "SheetIndex"
        .Range("E1").Value = "SheetName"
        .Range("F1").Value = "SheetVisibility"
        .Range("G1").Value = "CellAddressA1"
        .Range("H1").Value = "Row"
        .Range("I1").Value = "ColumnNumber"
        .Range("J1").Value = "ColumnLetter"
        .Range("K1").Value = "FormulaA1"
        .Range("L1").Value = "FormulaR1C1"
        .Range("M1").Value = "FormulaLength"
        .Range("N1").Value = "FormulaKind"
        .Range("O1").Value = "Note"

        .Rows(1).Font.Bold = True
        .Columns("K:L").NumberFormat = "@"
    End With

    outRow = 2

    For Each ws In wb.Worksheets

        If ws.Name <> V1_ROW2_FORMULA_REPORT_SHEET Then

            scannedSheetCount = scannedSheetCount + 1
            Application.StatusBar = "Scanning row " & SCAN_ROW & " in sheet: " & ws.Name

            Set formulaCells = Nothing

            On Error Resume Next
            Set formulaCells = ws.Rows(SCAN_ROW).SpecialCells(xlCellTypeFormulas)
            On Error GoTo Fail

            If formulaCells Is Nothing Then

                If INCLUDE_SHEETS_WITH_NO_ROW2_FORMULA Then
                    WriteNoFormulaRow reportWs, outRow, wb, ws, SCAN_ROW
                    outRow = outRow + 1
                End If

            Else

                For Each area In formulaCells.Areas
                    For Each c In area.Cells

                        WriteFormulaRow reportWs, outRow, wb, ws, c, SCAN_ROW

                        formulaCount = formulaCount + 1
                        outRow = outRow + 1

                    Next c
                Next area

            End If

        End If

    Next ws

    With reportWs
        .Columns("A:O").AutoFit
        .Range("A1:O1").AutoFilter
    End With

CleanExit:
    Application.StatusBar = oldStatusBar
    Application.DisplayAlerts = oldDisplayAlerts
    Application.EnableEvents = oldEnableEvents
    Application.ScreenUpdating = oldScreenUpdating

    Debug.Print "V1 row-2 formula report complete."
    Debug.Print "Workbook: " & wb.Name
    Debug.Print "Sheets scanned: " & scannedSheetCount
    Debug.Print "Formulas found in row " & SCAN_ROW & ": " & formulaCount
    Debug.Print "Report sheet: " & V1_ROW2_FORMULA_REPORT_SHEET

    Exit Sub

Fail:
    Application.StatusBar = oldStatusBar
    Application.DisplayAlerts = oldDisplayAlerts
    Application.EnableEvents = oldEnableEvents
    Application.ScreenUpdating = oldScreenUpdating

    Err.Raise Err.Number, "ListAllRow2Formulas", Err.Description

End Sub

Private Sub WriteFormulaRow( _
    ByVal reportWs As Worksheet, _
    ByVal outRow As Long, _
    ByVal wb As Workbook, _
    ByVal ws As Worksheet, _
    ByVal c As Range, _
    ByVal scannedRow As Long)

    If outRow > reportWs.Rows.Count Then
        Err.Raise vbObjectError + 1100, , "The report sheet ran out of rows."
    End If

    With reportWs
        .Cells(outRow, 1).Value = wb.Name
        .Cells(outRow, 2).Value = wb.FullName
        .Cells(outRow, 3).Value = scannedRow
        .Cells(outRow, 4).Value = ws.Index
        .Cells(outRow, 5).Value = ws.Name
        .Cells(outRow, 6).Value = WorksheetVisibilityText(ws)
        .Cells(outRow, 7).Value = c.Address(RowAbsolute:=False, ColumnAbsolute:=False, External:=False)
        .Cells(outRow, 8).Value = c.Row
        .Cells(outRow, 9).Value = c.Column
        .Cells(outRow, 10).Value = ColumnLetter(c.Column)

        ' Store formulas as text so the report does not execute them.
        .Cells(outRow, 11).Value = "'" & CStr(c.Formula)
        .Cells(outRow, 12).Value = "'" & CStr(c.FormulaR1C1)

        .Cells(outRow, 13).Value = Len(CStr(c.Formula))
        .Cells(outRow, 14).Value = FormulaKindText(c)
        .Cells(outRow, 15).Value = vbNullString
    End With

End Sub

Private Sub WriteNoFormulaRow( _
    ByVal reportWs As Worksheet, _
    ByVal outRow As Long, _
    ByVal wb As Workbook, _
    ByVal ws As Worksheet, _
    ByVal scannedRow As Long)

    If outRow > reportWs.Rows.Count Then
        Err.Raise vbObjectError + 1101, , "The report sheet ran out of rows."
    End If

    With reportWs
        .Cells(outRow, 1).Value = wb.Name
        .Cells(outRow, 2).Value = wb.FullName
        .Cells(outRow, 3).Value = scannedRow
        .Cells(outRow, 4).Value = ws.Index
        .Cells(outRow, 5).Value = ws.Name
        .Cells(outRow, 6).Value = WorksheetVisibilityText(ws)
        .Cells(outRow, 15).Value = "No formulas found in row " & scannedRow
    End With

End Sub

Private Sub DeleteWorksheetIfExists(ByVal wb As Workbook, ByVal sheetName As String)

    Dim ws As Worksheet

    For Each ws In wb.Worksheets
        If StrComp(ws.Name, sheetName, vbTextCompare) = 0 Then
            ws.Delete
            Exit Sub
        End If
    Next ws

End Sub

Private Function WorksheetVisibilityText(ByVal ws As Worksheet) As String

    Select Case ws.Visible
        Case xlSheetVisible
            WorksheetVisibilityText = "Visible"
        Case xlSheetHidden
            WorksheetVisibilityText = "Hidden"
        Case xlSheetVeryHidden
            WorksheetVisibilityText = "VeryHidden"
        Case Else
            WorksheetVisibilityText = "Unknown"
    End Select

End Function

Private Function ColumnLetter(ByVal columnNumber As Long) As String

    Dim n As Long
    Dim r As Long
    Dim result As String

    n = columnNumber
    result = vbNullString

    Do While n > 0
        r = (n - 1) Mod 26
        result = Chr$(65 + r) & result
        n = (n - r - 1) \ 26
    Loop

    ColumnLetter = result

End Function

Private Function FormulaKindText(ByVal c As Range) As String

    On Error GoTo Fallback

    If c.HasArray Then
        FormulaKindText = "Legacy array formula"
    Else
        FormulaKindText = "Formula"
    End If

    Exit Function

Fallback:
    FormulaKindText = "Formula"

End Function