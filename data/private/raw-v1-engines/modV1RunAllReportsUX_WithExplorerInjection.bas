Option Explicit

Private Const UX_TITLE As String = "V1 Engine Summary Export"

Private Const REPORT_CELL_FIELD_RELATION As String = "V1_Cell_Field_Relation"
Private Const REPORT_NAMED_RANGES As String = "V1_Named_Ranges"
Private Const REPORT_ROW2_FORMULAS As String = "V1_Row2_Formulas"

Private Const ENGINE_FORMULA_ROW As Long = 2
Private Const MAX_FORMULA_WARNING_EXAMPLES As Long = 8

Private Const EXPLORER_PRIMARY_FILE_NAME As String = "V1_Engine_Explorer.html"
Private Const EXPLORER_TITLE_FILE_NAME As String = "V1 Engine Explorer v2.6.8.2.html"
Private Const EXPLORER_UPLOADED_FILE_NAME As String = "c9bec55f-732c-4fcb-8b1d-0a3d5ca2668c.html"

Public Sub RunAllV1ReportsWithDialog()

    Dim wb As Workbook
    Dim outPath As String
    Dim viewerPath As String
    Dim formulaCountOutsideRow2 As Long
    Dim formulaExamples As String
    Dim userChoice As VbMsgBoxResult
    Dim keepTabsChoice As VbMsgBoxResult

    Dim progressForm As frmV1Progress

    Dim oldScreenUpdating As Boolean
    Dim oldEnableEvents As Boolean
    Dim oldDisplayAlerts As Boolean
    Dim oldStatusBar As Variant
    Dim stateCaptured As Boolean

    On Error GoTo Fail

    Set wb = ActiveWorkbook

    If wb Is Nothing Then
        MsgBox "No active workbook was found." & vbCrLf & vbCrLf & _
               "Open the V1 engine workbook and run this macro again.", _
               vbCritical, UX_TITLE
        Exit Sub
    End If

    If wb.ProtectStructure Then
        MsgBox "The workbook structure is protected." & vbCrLf & vbCrLf & _
               "This macro must create and optionally delete report tabs." & vbCrLf & _
               "Unprotect the workbook structure and run this macro again.", _
               vbCritical, UX_TITLE
        Exit Sub
    End If

    If Len(ThisWorkbook.Path) = 0 Then
        MsgBox "The workbook containing this Visual Basic for Applications project has not been saved." & vbCrLf & vbCrLf & _
               "The JSON export routine requires the macro workbook to have a folder path." & vbCrLf & _
               "Save the macro-enabled workbook first, then run this macro again.", _
               vbCritical, UX_TITLE
        Exit Sub
    End If

    userChoice = MsgBox( _
        "This macro will run the full V1 engine summary export and open the V1 Engine Explorer." & vbCrLf & vbCrLf & _
        "Before continuing, confirm this rule:" & vbCrLf & _
        "Formulas should exist only in row " & ENGINE_FORMULA_ROW & "." & vbCrLf & _
        "Any formulas outside row " & ENGINE_FORMULA_ROW & " should be cleaned or converted to values." & vbCrLf & vbCrLf & _
        "Sequence to be run:" & vbCrLf & _
        "1. V1 cell-field relation report" & vbCrLf & _
        "2. V1 named-ranges report" & vbCrLf & _
        "3. V1 row-2 formula report" & vbCrLf & _
        "4. V1 summary JSON export" & vbCrLf & _
        "5. Inject JSON into the V1 Engine Explorer HTML and open it" & vbCrLf & vbCrLf & _
        "Click OK to scan the workbook now." & vbCrLf & _
        "Click Cancel to stop.", _
        vbInformation + vbOKCancel + vbDefaultButton1, _
        UX_TITLE)

    If userChoice = vbCancel Then Exit Sub

    formulaCountOutsideRow2 = CountFormulasOutsideEngineRow(wb, formulaExamples)

    If formulaCountOutsideRow2 > 0 Then

        userChoice = MsgBox( _
            "QUESTION: Continue even though formulas were found outside row " & ENGINE_FORMULA_ROW & "?" & vbCrLf & vbCrLf & _
            "Recommended answer: No." & vbCrLf & vbCrLf & _
            "Formula count outside row " & ENGINE_FORMULA_ROW & ": " & CStr(formulaCountOutsideRow2) & vbCrLf & vbCrLf & _
            "Sample locations:" & vbCrLf & _
            formulaExamples & vbCrLf & _
            "Choose:" & vbCrLf & _
            "Yes = continue anyway" & vbCrLf & _
            "No = stop now so you can clean the workbook", _
            vbExclamation + vbYesNo + vbDefaultButton2, _
            UX_TITLE)

        If userChoice = vbNo Then Exit Sub

    Else

        MsgBox "Formula check passed." & vbCrLf & vbCrLf & _
               "No formulas outside row " & ENGINE_FORMULA_ROW & " were detected in non-generated sheets." & vbCrLf & vbCrLf & _
               "The export pipeline will now run.", _
               vbInformation, UX_TITLE

    End If

    oldScreenUpdating = Application.ScreenUpdating
    oldEnableEvents = Application.EnableEvents
    oldDisplayAlerts = Application.DisplayAlerts
    oldStatusBar = Application.StatusBar
    stateCaptured = True

    Application.ScreenUpdating = False
    Application.EnableEvents = False
    Application.DisplayAlerts = False

    Set progressForm = New frmV1Progress
    progressForm.Show vbModeless
    progressForm.SetProgress 0, 5, "Starting V1 engine export", "Preparing the workbook and report pipeline.", 2

    Application.StatusBar = "Preparing V1 engine export..."
    DoEvents

    progressForm.SetProgress 1, 5, "Creating cell-field relation report", _
                             "Scanning workbook tabs and mapping row-2 cells to field names.", 10
    Application.StatusBar = "Step 1 of 5: creating V1 cell-field relation report..."
    DoEvents
    CreateWorkbookCellFieldRelation

    progressForm.SetProgress 2, 5, "Creating named-ranges report", _
                             "Collecting workbook-level and worksheet-level named ranges.", 30
    Application.StatusBar = "Step 2 of 5: creating V1 named-ranges report..."
    DoEvents
    CreateV1NamedRangesReport

    progressForm.SetProgress 3, 5, "Creating row-2 formula report", _
                             "Extracting formulas from row 2 across visible engine tabs.", 50
    Application.StatusBar = "Step 3 of 5: creating V1 row-2 formula report..."
    DoEvents
    CreateV1Row2FormulaReport

    progressForm.SetProgress 4, 5, "Exporting JSON summary", _
                             "Building and saving the V1 engine summary JSON file.", 72
    Application.StatusBar = "Step 4 of 5: exporting V1 engine summary JSON..."
    DoEvents
    outPath = ExportV1SummaryJsonOptionB(True)

    If Len(outPath) = 0 Then
        RestoreApplicationState oldScreenUpdating, oldEnableEvents, oldDisplayAlerts, oldStatusBar, stateCaptured

        progressForm.SetFailed "JSON export was canceled."
        PauseBriefly 1
        Unload progressForm

        MsgBox "JSON export was canceled." & vbCrLf & vbCrLf & _
               "The intermediate report tabs were left in the workbook.", _
               vbInformation, UX_TITLE
        Exit Sub
    End If

    progressForm.SetProgress 5, 5, "Opening V1 Engine Explorer", _
                             "Injecting the JSON into a generated HTML viewer and opening it.", 92
    Application.StatusBar = "Step 5 of 5: opening V1 Engine Explorer..."
    DoEvents
    viewerPath = OpenV1EngineExplorerWithJson(outPath)

    progressForm.SetFinished "JSON file created and V1 Engine Explorer opened."
    PauseBriefly 1

    RestoreApplicationState oldScreenUpdating, oldEnableEvents, oldDisplayAlerts, oldStatusBar, stateCaptured

    Unload progressForm
    Set progressForm = Nothing

    keepTabsChoice = MsgBox( _
        "JSON export completed successfully and the V1 Engine Explorer was opened." & vbCrLf & vbCrLf & _
        "JSON file:" & vbCrLf & _
        outPath & vbCrLf & vbCrLf & _
        "Generated HTML viewer:" & vbCrLf & _
        viewerPath & vbCrLf & vbCrLf & _
        "QUESTION: Do you want to keep the generated report tabs in the workbook?" & vbCrLf & vbCrLf & _
        "Yes = keep the generated tabs" & vbCrLf & _
        "No = delete the generated tabs", _
        vbQuestion + vbYesNo + vbDefaultButton1, _
        UX_TITLE)

    If keepTabsChoice = vbNo Then

        DeleteGeneratedReportTabs wb

        MsgBox "Done." & vbCrLf & vbCrLf & _
               "The JSON file was created successfully." & vbCrLf & _
               "The V1 Engine Explorer was opened." & vbCrLf & _
               "The generated report tabs were deleted.", _
               vbInformation, UX_TITLE

    Else

        MsgBox "Done." & vbCrLf & vbCrLf & _
               "The JSON file was created successfully." & vbCrLf & _
               "The V1 Engine Explorer was opened." & vbCrLf & _
               "The generated report tabs were kept.", _
               vbInformation, UX_TITLE

    End If

    Exit Sub

Fail:
    RestoreApplicationState oldScreenUpdating, oldEnableEvents, oldDisplayAlerts, oldStatusBar, stateCaptured

    On Error Resume Next
    If Not progressForm Is Nothing Then
        progressForm.SetFailed "The pipeline stopped because of an error."
        PauseBriefly 1
        Unload progressForm
    End If
    On Error GoTo 0

    MsgBox "The V1 export pipeline stopped because of an error." & vbCrLf & vbCrLf & _
           "Error number: " & CStr(Err.Number) & vbCrLf & _
           "Error source: " & Err.Source & vbCrLf & _
           "Error description: " & Err.Description & vbCrLf & vbCrLf & _
           ErrorGuidance(Err.Number, Err.Description), _
           vbCritical, UX_TITLE

End Sub

Public Function OpenV1EngineExplorerWithJson(ByVal jsonPath As String) As String

    Dim htmlTemplatePath As String
    Dim outputHtmlPath As String
    Dim htmlText As String
    Dim jsonText As String

    If Len(Trim$(jsonPath)) = 0 Then
        Err.Raise vbObjectError + 9300, "OpenV1EngineExplorerWithJson", _
            "No JSON path was provided."
    End If

    If Not FileExists(jsonPath) Then
        Err.Raise vbObjectError + 9301, "OpenV1EngineExplorerWithJson", _
            "The JSON file does not exist: " & jsonPath
    End If

    htmlTemplatePath = ResolveV1ExplorerTemplatePath(jsonPath)

    htmlText = ReadUtf8TextFile(htmlTemplatePath)
    jsonText = ReadUtf8TextFile(jsonPath)

    htmlText = InjectJsonIntoDataBlock(htmlText, jsonText)
    htmlText = SetEmbeddedDatasetDisplayName(htmlText, FileNameFromPath(jsonPath))

    outputHtmlPath = GeneratedViewerPath(jsonPath)

    WriteUtf8TextFile outputHtmlPath, htmlText

    ThisWorkbook.FollowHyperlink Address:=outputHtmlPath, NewWindow:=True

    OpenV1EngineExplorerWithJson = outputHtmlPath

End Function

Private Function InjectJsonIntoDataBlock( _
    ByVal htmlText As String, _
    ByVal jsonText As String) As String

    Dim startTag As String
    Dim startPos As Long
    Dim contentStart As Long
    Dim endPos As Long
    Dim safeJson As String

    startTag = "<script id=""data-block"" type=""application/json"">"

    startPos = InStr(1, htmlText, startTag, vbTextCompare)

    If startPos = 0 Then
        Err.Raise vbObjectError + 9310, "InjectJsonIntoDataBlock", _
            "Could not find the embedded JSON block: " & startTag
    End If

    contentStart = startPos + Len(startTag)
    endPos = InStr(contentStart, htmlText, "</script>", vbTextCompare)

    If endPos = 0 Then
        Err.Raise vbObjectError + 9311, "InjectJsonIntoDataBlock", _
            "Could not find the closing </script> tag for the embedded JSON block."
    End If

    safeJson = EscapeJsonForHtmlScriptBlock(jsonText)

    InjectJsonIntoDataBlock = _
        Left$(htmlText, contentStart - 1) & _
        vbCrLf & safeJson & vbCrLf & _
        Mid$(htmlText, endPos)

End Function

Private Function SetEmbeddedDatasetDisplayName( _
    ByVal htmlText As String, _
    ByVal jsonFileName As String) As String

    Dim oldText As String
    Dim newText As String

    oldText = "datasetDisplayName(DATA, 'Embedded sample dataset')"
    newText = "datasetDisplayName(DATA, " & JsSingleQuotedString(jsonFileName) & ")"

    SetEmbeddedDatasetDisplayName = Replace(htmlText, oldText, newText, 1, -1, vbTextCompare)

End Function

Private Function EscapeJsonForHtmlScriptBlock(ByVal jsonText As String) As String

    Dim s As String

    s = CStr(jsonText)

    s = Replace(s, "</script", "<\/script", 1, -1, vbTextCompare)

    s = Replace(s, "&", "\u0026")
    s = Replace(s, "<", "\u003C")
    s = Replace(s, ">", "\u003E")
    s = Replace(s, ChrW$(&H2028), "\u2028")
    s = Replace(s, ChrW$(&H2029), "\u2029")

    EscapeJsonForHtmlScriptBlock = s

End Function

Private Function ResolveV1ExplorerTemplatePath(ByVal jsonPath As String) As String

    Dim candidates As Collection
    Dim folderJson As String
    Dim folderMacro As String
    Dim p As Variant
    Dim picked As Variant

    Set candidates = New Collection

    folderJson = FolderFromPath(jsonPath)
    folderMacro = ThisWorkbook.Path

    If Len(folderJson) > 0 Then
        candidates.Add CombinePath(folderJson, EXPLORER_PRIMARY_FILE_NAME)
        candidates.Add CombinePath(folderJson, EXPLORER_TITLE_FILE_NAME)
        candidates.Add CombinePath(folderJson, EXPLORER_UPLOADED_FILE_NAME)
    End If

    If Len(folderMacro) > 0 Then
        candidates.Add CombinePath(folderMacro, EXPLORER_PRIMARY_FILE_NAME)
        candidates.Add CombinePath(folderMacro, EXPLORER_TITLE_FILE_NAME)
        candidates.Add CombinePath(folderMacro, EXPLORER_UPLOADED_FILE_NAME)
    End If

    For Each p In candidates
        If FileExists(CStr(p)) Then
            ResolveV1ExplorerTemplatePath = CStr(p)
            Exit Function
        End If
    Next p

    picked = Application.GetOpenFilename( _
        FileFilter:="HTML Files (*.html;*.htm),*.html;*.htm", _
        Title:="Select the V1 Engine Explorer HTML template")

    If VarType(picked) = vbBoolean Then
        Err.Raise vbObjectError + 9320, "ResolveV1ExplorerTemplatePath", _
            "No V1 Engine Explorer HTML template was selected."
    End If

    ResolveV1ExplorerTemplatePath = CStr(picked)

End Function

Private Function GeneratedViewerPath(ByVal jsonPath As String) As String

    Dim folderPath As String
    Dim stem As String

    folderPath = FolderFromPath(jsonPath)
    stem = SafeFileStem(BaseNameWithoutExtension(FileNameFromPath(jsonPath)))

    If Len(folderPath) = 0 Then
        folderPath = Environ$("TEMP")
    End If

    GeneratedViewerPath = CombinePath( _
        folderPath, _
        stem & "_V1_Engine_Explorer_" & Format$(Now, "yyyymmdd_hhnnss") & ".html")

End Function

Private Function ReadUtf8TextFile(ByVal filePath As String) As String

    Dim stream As Object

    Set stream = CreateObject("ADODB.Stream")

    With stream
        .Type = 2
        .Charset = "utf-8"
        .Open
        .LoadFromFile filePath
        ReadUtf8TextFile = .ReadText(-1)
        .Close
    End With

End Function

Private Sub WriteUtf8TextFile( _
    ByVal filePath As String, _
    ByVal textValue As String)

    Dim stream As Object

    Set stream = CreateObject("ADODB.Stream")

    With stream
        .Type = 2
        .Charset = "utf-8"
        .Open
        .WriteText textValue
        .SaveToFile filePath, 2
        .Close
    End With

End Sub

Private Function CountFormulasOutsideEngineRow( _
    ByVal wb As Workbook, _
    ByRef examplesOut As String) As Long

    Dim ws As Worksheet
    Dim formulaCells As Range
    Dim area As Range
    Dim cell As Range
    Dim n As Long
    Dim exampleCount As Long

    examplesOut = vbNullString

    For Each ws In wb.Worksheets

        If Not IsGeneratedReportSheet(ws.Name) Then

            Set formulaCells = Nothing

            On Error Resume Next
            Set formulaCells = ws.UsedRange.SpecialCells(xlCellTypeFormulas)
            On Error GoTo 0

            If Not formulaCells Is Nothing Then

                For Each area In formulaCells.Areas
                    For Each cell In area.Cells

                        If cell.Row <> ENGINE_FORMULA_ROW Then

                            n = n + 1

                            If exampleCount < MAX_FORMULA_WARNING_EXAMPLES Then
                                exampleCount = exampleCount + 1
                                examplesOut = examplesOut & _
                                              " - " & SheetCellLabel(cell) & vbCrLf
                            End If

                        End If

                    Next cell
                Next area

            End If

        End If

    Next ws

    If n > exampleCount Then
        examplesOut = examplesOut & _
                      " - ... plus " & CStr(n - exampleCount) & " more locations." & vbCrLf
    End If

    CountFormulasOutsideEngineRow = n

End Function

Private Function SheetCellLabel(ByVal cell As Range) As String

    Dim visibilityText As String

    If cell.Worksheet.Visible = xlSheetVisible Then
        visibilityText = vbNullString
    Else
        visibilityText = " [hidden sheet]"
    End If

    SheetCellLabel = "'" & cell.Worksheet.Name & "'!" & _
                     cell.Address(RowAbsolute:=False, ColumnAbsolute:=False) & _
                     visibilityText

End Function

Private Function IsGeneratedReportSheet(ByVal sheetName As String) As Boolean

    Select Case UCase$(CleanTextLocal(sheetName))

        Case UCase$(REPORT_CELL_FIELD_RELATION), _
             UCase$(REPORT_NAMED_RANGES), _
             UCase$(REPORT_ROW2_FORMULAS)

            IsGeneratedReportSheet = True

        Case Else

            IsGeneratedReportSheet = False

    End Select

End Function

Private Sub DeleteGeneratedReportTabs(ByVal wb As Workbook)

    Dim oldDisplayAlerts As Boolean

    oldDisplayAlerts = Application.DisplayAlerts
    Application.DisplayAlerts = False

    DeleteWorksheetIfExistsLocal wb, REPORT_ROW2_FORMULAS
    DeleteWorksheetIfExistsLocal wb, REPORT_NAMED_RANGES
    DeleteWorksheetIfExistsLocal wb, REPORT_CELL_FIELD_RELATION

    Application.DisplayAlerts = oldDisplayAlerts

End Sub

Private Sub DeleteWorksheetIfExistsLocal( _
    ByVal wb As Workbook, _
    ByVal sheetName As String)

    Dim ws As Worksheet

    For Each ws In wb.Worksheets

        If StrComp(ws.Name, sheetName, vbTextCompare) = 0 Then

            If wb.Worksheets.Count <= 1 Then
                Err.Raise vbObjectError + 9100, , _
                    "Cannot delete worksheet '" & sheetName & "' because it is the only worksheet in the workbook."
            End If

            ws.Delete
            Exit Sub

        End If

    Next ws

End Sub

Private Sub RestoreApplicationState( _
    ByVal oldScreenUpdating As Boolean, _
    ByVal oldEnableEvents As Boolean, _
    ByVal oldDisplayAlerts As Boolean, _
    ByVal oldStatusBar As Variant, _
    ByVal stateCaptured As Boolean)

    On Error Resume Next

    If stateCaptured Then
        Application.StatusBar = oldStatusBar
        Application.DisplayAlerts = oldDisplayAlerts
        Application.EnableEvents = oldEnableEvents
        Application.ScreenUpdating = oldScreenUpdating
    Else
        Application.StatusBar = False
    End If

    On Error GoTo 0

End Sub

Private Function ErrorGuidance( _
    ByVal errorNumber As Long, _
    ByVal errorDescription As String) As String

    Dim s As String

    s = LCase$(CStr(errorDescription))

    If InStr(1, s, "workbook containing this vba project has not been saved", vbTextCompare) > 0 Or _
       InStr(1, s, "workbook containing this visual basic for applications project has not been saved", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "Save the macro-enabled workbook that contains these modules, then run the macro again."
        Exit Function

    End If

    If InStr(1, s, "could not find the embedded json block", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "Use the V1 Engine Explorer HTML that contains this block:" & vbCrLf & _
            "<script id=""data-block"" type=""application/json"">"
        Exit Function

    End If

    If InStr(1, s, "html template", vbTextCompare) > 0 Or _
       InStr(1, s, "no v1 engine explorer", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "Place the V1 Engine Explorer HTML file in the same folder as the JSON export or the macro workbook." & vbCrLf & _
            "Recommended file name: " & EXPLORER_PRIMARY_FILE_NAME
        Exit Function

    End If

    If InStr(1, s, "worksheet not found", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "The JSON export could not find one of the required report tabs." & vbCrLf & _
            "Run the full wrapper again and make sure the first three report routines complete successfully."
        Exit Function

    End If

    If InStr(1, s, "required header not found", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "One of the generated report tabs is missing a required header." & vbCrLf & _
            "Delete the generated report tabs and run the wrapper again."
        Exit Function

    End If

    If InStr(1, s, "permission", vbTextCompare) > 0 Or _
       InStr(1, s, "path", vbTextCompare) > 0 Or _
       InStr(1, s, "save", vbTextCompare) > 0 Then

        ErrorGuidance = _
            "Recommended fix:" & vbCrLf & _
            "Choose a folder where you have write permission." & vbCrLf & _
            "If the JSON file or generated HTML viewer is already open in another program, close it and run the macro again."
        Exit Function

    End If

    ErrorGuidance = _
        "Recommended checks:" & vbCrLf & _
        "1. Confirm all four required report modules are imported." & vbCrLf & _
        "2. Confirm the active workbook is the V1 engine workbook." & vbCrLf & _
        "3. Confirm workbook structure is not protected." & vbCrLf & _
        "4. Confirm the V1 Engine Explorer HTML file is available." & vbCrLf & _
        "5. Confirm formulas outside row " & ENGINE_FORMULA_ROW & " have been cleaned or intentionally accepted."

End Function

Private Function CleanTextLocal(ByVal textValue As String) As String

    Dim s As String

    s = CStr(textValue)
    s = Replace(s, vbCr, " ")
    s = Replace(s, vbLf, " ")
    s = Replace(s, vbTab, " ")
    s = Replace(s, Chr$(160), " ")
    s = Trim$(s)

    Do While InStr(1, s, "  ", vbBinaryCompare) > 0
        s = Replace(s, "  ", " ")
    Loop

    CleanTextLocal = s

End Function

Private Sub PauseBriefly(ByVal secondsToPause As Double)

    Dim endTime As Date

    endTime = DateAdd("s", secondsToPause, Now)

    Do While Now < endTime
        DoEvents
    Loop

End Sub

Private Function FileExists(ByVal filePath As String) As Boolean

    FileExists = (Len(Dir$(filePath, vbNormal)) > 0)

End Function

Private Function FolderFromPath(ByVal filePath As String) As String

    Dim p As Long

    p = InStrRev(filePath, "\")

    If p > 0 Then
        FolderFromPath = Left$(filePath, p - 1)
    Else
        FolderFromPath = vbNullString
    End If

End Function

Private Function FileNameFromPath(ByVal filePath As String) As String

    Dim p As Long

    p = InStrRev(filePath, "\")

    If p > 0 Then
        FileNameFromPath = Mid$(filePath, p + 1)
    Else
        FileNameFromPath = filePath
    End If

End Function

Private Function CombinePath( _
    ByVal folderPath As String, _
    ByVal fileName As String) As String

    If Right$(folderPath, 1) = "\" Then
        CombinePath = folderPath & fileName
    Else
        CombinePath = folderPath & "\" & fileName
    End If

End Function

Private Function BaseNameWithoutExtension(ByVal fileName As String) As String

    Dim p As Long

    p = InStrRev(fileName, ".")

    If p > 1 Then
        BaseNameWithoutExtension = Left$(fileName, p - 1)
    Else
        BaseNameWithoutExtension = fileName
    End If

End Function

Private Function SafeFileStem(ByVal fileStem As String) As String

    Dim s As String
    Dim badChars As Variant
    Dim i As Long

    s = CleanTextLocal(fileStem)

    badChars = Array("\", "/", ":", "*", "?", """", "<", ">", "|", "[", "]", "{", "}", "(", ")", "'", "`", "~")

    For i = LBound(badChars) To UBound(badChars)
        s = Replace(s, CStr(badChars(i)), "_")
    Next i

    Do While InStr(1, s, "__", vbBinaryCompare) > 0
        s = Replace(s, "__", "_")
    Loop

    If Len(s) = 0 Then
        s = "v1_summary"
    End If

    SafeFileStem = s

End Function

Private Function JsSingleQuotedString(ByVal textValue As String) As String

    Dim s As String

    s = CStr(textValue)
    s = Replace(s, "\", "\\")
    s = Replace(s, "'", "\'")
    s = Replace(s, vbCr, "\r")
    s = Replace(s, vbLf, "\n")
    s = Replace(s, "</script", "<\/script", 1, -1, vbTextCompare)

    JsSingleQuotedString = "'" & s & "'"

End Function
