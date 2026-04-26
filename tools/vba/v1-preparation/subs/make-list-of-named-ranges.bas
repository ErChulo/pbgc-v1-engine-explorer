Option Explicit

Public Const V1_NAMED_RANGES_REPORT_SHEET As String = "V1_Named_Ranges"

Public Sub MakeListOfNamedRanges()

    Dim wb As Workbook
    Dim reportWs As Worksheet
    Dim outRow As Long
    Dim namedRangeCount As Long

    Dim nm As Name
    Dim ws As Worksheet

    Dim oldScreenUpdating As Boolean
    Dim oldEnableEvents As Boolean
    Dim oldDisplayAlerts As Boolean
    Dim oldStatusBar As Variant

    On Error GoTo Fail

    Set wb = ActiveWorkbook

    If wb Is Nothing Then
        Err.Raise vbObjectError + 2000, , "No active workbook found."
    End If

    oldScreenUpdating = Application.ScreenUpdating
    oldEnableEvents = Application.EnableEvents
    oldDisplayAlerts = Application.DisplayAlerts
    oldStatusBar = Application.StatusBar

    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.DisplayAlerts = False
    Application.StatusBar = "Creating V1 named-ranges report..."

    DeleteWorksheetIfExists wb, V1_NAMED_RANGES_REPORT_SHEET

    Set reportWs = wb.Worksheets.Add(After:=wb.Worksheets(wb.Worksheets.Count))
    reportWs.Name = V1_NAMED_RANGES_REPORT_SHEET

    WriteNamedRangeHeaders reportWs

    outRow = 2

    ' Workbook-scoped names.
    For Each nm In wb.Names
        WriteNameRow reportWs, outRow, wb, Nothing, nm, "Workbook"
        namedRangeCount = namedRangeCount + 1
        outRow = outRow + 1
    Next nm

    ' Worksheet-scoped names.
    For Each ws In wb.Worksheets
        If ws.Name <> V1_NAMED_RANGES_REPORT_SHEET Then
            For Each nm In ws.Names
                WriteNameRow reportWs, outRow, wb, ws, nm, "Worksheet"
                namedRangeCount = namedRangeCount + 1
                outRow = outRow + 1
            Next nm
        End If
    Next ws

    If namedRangeCount = 0 Then
        With reportWs
            .Cells(outRow, 1).Value = wb.Name
            .Cells(outRow, 2).Value = wb.FullName
            .Cells(outRow, 3).Value = "No named ranges found."
        End With
    End If

    With reportWs
        .Columns("A:Q").AutoFit
        .Range("A1:Q1").AutoFilter
        .Rows(1).Font.Bold = True
    End With

CleanExit:
    Application.StatusBar = oldStatusBar
    Application.DisplayAlerts = oldDisplayAlerts
    Application.EnableEvents = oldEnableEvents
    Application.ScreenUpdating = oldScreenUpdating

    Debug.Print "V1 named-ranges report complete."
    Debug.Print "Workbook: " & wb.Name
    Debug.Print "Named ranges found: " & namedRangeCount
    Debug.Print "Report sheet: " & V1_NAMED_RANGES_REPORT_SHEET

    Exit Sub

Fail:
    Application.StatusBar = oldStatusBar
    Application.DisplayAlerts = oldDisplayAlerts
    Application.EnableEvents = oldEnableEvents
    Application.ScreenUpdating = oldScreenUpdating

    Err.Raise Err.Number, "MakeListOfNamedRanges", Err.Description

End Sub

Private Sub WriteNamedRangeHeaders(ByVal reportWs As Worksheet)

    With reportWs
        .Cells(1, 1).Value = "WorkbookName"
        .Cells(1, 2).Value = "WorkbookFullName"
        .Cells(1, 3).Value = "ScopeType"
        .Cells(1, 4).Value = "ScopeName"
        .Cells(1, 5).Value = "Name"
        .Cells(1, 6).Value = "NameLocal"
        .Cells(1, 7).Value = "FullName"
        .Cells(1, 8).Value = "Visible"
        .Cells(1, 9).Value = "RefersTo"
        .Cells(1, 10).Value = "RefersToR1C1"
        .Cells(1, 11).Value = "RefersToRangeAddress"
        .Cells(1, 12).Value = "RefersToSheet"
        .Cells(1, 13).Value = "RefersToWorkbook"
        .Cells(1, 14).Value = "NameKind"
        .Cells(1, 15).Value = "HasRefError"
        .Cells(1, 16).Value = "IsExternalReference"
        .Cells(1, 17).Value = "Comment"

        .Columns("I:J").NumberFormat = "@"
    End With

End Sub

Private Sub WriteNameRow( _
    ByVal reportWs As Worksheet, _
    ByVal outRow As Long, _
    ByVal wb As Workbook, _
    ByVal scopeWs As Worksheet, _
    ByVal nm As Name, _
    ByVal scopeType As String)

    Dim refersToText As String
    Dim refersToR1C1Text As String
    Dim refersToRangeAddress As String
    Dim refersToSheet As String
    Dim refersToWorkbook As String
    Dim nameKind As String
    Dim hasRefError As Boolean
    Dim isExternalReference As Boolean
    Dim commentText As String
    Dim fullName As String
    Dim scopeName As String

    refersToText = SafeNameRefersTo(nm)
    refersToR1C1Text = SafeNameRefersToR1C1(nm)

    hasRefError = HasSubstring(refersToText, "#REF!")
    isExternalReference = IsExternalRefersTo(refersToText)

    GetRefersToRangeInfo nm, refersToRangeAddress, refersToSheet, refersToWorkbook, nameKind

    commentText = SafeNameComment(nm)

    If scopeWs Is Nothing Then
        scopeName = "Workbook"
    Else
        scopeName = scopeWs.Name
    End If

    fullName = GetFullName(scopeWs, nm)

    With reportWs
        .Cells(outRow, 1).Value = wb.Name
        .Cells(outRow, 2).Value = wb.FullName
        .Cells(outRow, 3).Value = scopeType
        .Cells(outRow, 4).Value = scopeName
        .Cells(outRow, 5).Value = nm.Name
        .Cells(outRow, 6).Value = SafeNameLocal(nm)
        .Cells(outRow, 7).Value = fullName
        .Cells(outRow, 8).Value = CStr(nm.Visible)

        ' Store formula-like text safely as text, not executable formulas.
        .Cells(outRow, 9).Value = "'" & refersToText
        .Cells(outRow, 10).Value = "'" & refersToR1C1Text

        .Cells(outRow, 11).Value = refersToRangeAddress
        .Cells(outRow, 12).Value = refersToSheet
        .Cells(outRow, 13).Value = refersToWorkbook
        .Cells(outRow, 14).Value = nameKind
        .Cells(outRow, 15).Value = CStr(hasRefError)
        .Cells(outRow, 16).Value = CStr(isExternalReference)
        .Cells(outRow, 17).Value = commentText
    End With

End Sub

Private Function SafeNameRefersTo(ByVal nm As Name) As String

    On Error GoTo Fail
    SafeNameRefersTo = CStr(nm.RefersTo)
    Exit Function

Fail:
    SafeNameRefersTo = "#ERROR reading RefersTo: " & Err.Description

End Function

Private Function SafeNameRefersToR1C1(ByVal nm As Name) As String

    On Error GoTo Fail
    SafeNameRefersToR1C1 = CStr(nm.RefersToR1C1)
    Exit Function

Fail:
    SafeNameRefersToR1C1 = "#ERROR reading RefersToR1C1: " & Err.Description

End Function

Private Function SafeNameLocal(ByVal nm As Name) As String

    On Error GoTo Fail
    SafeNameLocal = CStr(nm.NameLocal)
    Exit Function

Fail:
    SafeNameLocal = vbNullString

End Function

Private Function SafeNameComment(ByVal nm As Name) As String

    On Error GoTo Fail
    SafeNameComment = CStr(nm.Comment)
    Exit Function

Fail:
    SafeNameComment = vbNullString

End Function

Private Function GetFullName(ByVal scopeWs As Worksheet, ByVal nm As Name) As String

    If scopeWs Is Nothing Then
        GetFullName = nm.Name
    Else
        GetFullName = scopeWs.Name & "!" & nm.Name
    End If

End Function

Private Sub GetRefersToRangeInfo( _
    ByVal nm As Name, _
    ByRef rangeAddress As String, _
    ByRef sheetName As String, _
    ByRef workbookName As String, _
    ByRef nameKind As String)

    Dim rng As Range

    On Error GoTo NotRange

    Set rng = nm.RefersToRange

    rangeAddress = rng.Address(RowAbsolute:=False, ColumnAbsolute:=False, External:=False)
    sheetName = rng.Worksheet.Name
    workbookName = rng.Worksheet.Parent.Name
    nameKind = "Range"

    Exit Sub

NotRange:
    rangeAddress = vbNullString
    sheetName = vbNullString
    workbookName = vbNullString
    nameKind = ClassifyNameKind(SafeNameRefersTo(nm))

End Sub

Private Function ClassifyNameKind(ByVal refersToText As String) As String

    Dim s As String

    s = Trim$(refersToText)

    If Len(s) = 0 Then
        ClassifyNameKind = "Blank or unreadable"
    ElseIf HasSubstring(s, "#REF!") Then
        ClassifyNameKind = "Invalid reference"
    ElseIf Left$(s, 2) = "=""" Then
        ClassifyNameKind = "Text constant"
    ElseIf Left$(s, 1) = "=" And IsNumeric(Mid$(s, 2)) Then
        ClassifyNameKind = "Numeric constant"
    ElseIf Left$(s, 1) = "=" Then
        ClassifyNameKind = "Formula or expression"
    Else
        ClassifyNameKind = "Other"
    End If

End Function

Private Function IsExternalRefersTo(ByVal refersToText As String) As Boolean

    IsExternalRefersTo = False

    If InStr(1, refersToText, "[", vbTextCompare) > 0 And _
       InStr(1, refersToText, "]", vbTextCompare) > 0 Then
        IsExternalRefersTo = True
    End If

End Function

Private Function HasSubstring(ByVal textValue As String, ByVal searchValue As String) As Boolean

    HasSubstring = (InStr(1, textValue, searchValue, vbTextCompare) > 0)

End Function

Private Sub DeleteWorksheetIfExists(ByVal wb As Workbook, ByVal sheetName As String)

    Dim ws As Worksheet

    For Each ws In wb.Worksheets
        If StrComp(ws.Name, sheetName, vbTextCompare) = 0 Then
            ws.Delete
            Exit Sub
        End If
    Next ws

End Sub