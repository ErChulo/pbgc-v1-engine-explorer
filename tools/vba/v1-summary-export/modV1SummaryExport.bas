Option Explicit

Public Sub ExportV1SummaryJson()
    Const RELATION_SHEET As String = "Cell-Fields Relation"
    Const DESCRIPTIONS_SHEET As String = "Field Descriptions"
    Const NAMED_RANGES_SHEET As String = "Named Ranges"
    Const FORMULAS_SHEET As String = "Formulas"

    Dim wb As Workbook
    Dim wsRelation As Worksheet, wsDescriptions As Worksheet, wsNamed As Worksheet, wsFormulas As Worksheet
    Dim relationData As Variant, descData As Variant, namedData As Variant, formulaData As Variant
    Dim runs As Object, namedRanges As Object, cells As Object, formulas As Object, dependents As Object
    Dim formulaCells As Collection
    Dim i As Long
    Dim outPath As Variant
    Dim jsonText As String

    Set wb = ThisWorkbook
    Set wsRelation = GetWorksheetByName(wb, RELATION_SHEET)
    Set wsDescriptions = GetWorksheetByName(wb, DESCRIPTIONS_SHEET)
    Set wsNamed = GetWorksheetByName(wb, NAMED_RANGES_SHEET)
    Set wsFormulas = GetWorksheetByName(wb, FORMULAS_SHEET)

    ValidateHeader wsRelation, Array("CELL_ADDRESS", "RUN", "FIELD_NAME_AT_RUN", "I/O/B")
    ValidateHeader wsDescriptions, Array("CELL", "FIELD", "DESCRIPTION")
    ValidateHeader wsNamed, Array("NAMED_RANGE_LABEL")
    ValidateHeader wsFormulas, Array("CELL_ADDRESS", "SHEET_NAME", "FORMULA")

    Set runs = CreateObject("Scripting.Dictionary")
    Set namedRanges = CreateObject("Scripting.Dictionary")
    Set cells = CreateObject("Scripting.Dictionary")
    Set formulas = CreateObject("Scripting.Dictionary")
    Set dependents = CreateObject("Scripting.Dictionary")
    Set formulaCells = New Collection

    relationData = UsedRangeValues(wsRelation)
    descData = UsedRangeValues(wsDescriptions)
    namedData = UsedRangeValues(wsNamed)
    formulaData = UsedRangeValues(wsFormulas)

    For i = 2 To UBound(namedData, 1)
        If Trim$(CStr(namedData(i, 1))) <> vbNullString Then
            AddUniqueKey namedRanges, CStr(namedData(i, 1))
        End If
    Next i

    For i = 2 To UBound(descData, 1)
        Dim descCell As String, descField As String, descText As String
        Dim cellRec As Object
        descCell = NormalizeCellAddress(CStr(descData(i, 1)))
        descField = Trim$(CStr(descData(i, 2)))
        descText = Trim$(CStr(descData(i, 3)))
        If descCell <> vbNullString Then
            Set cellRec = EnsureCellRecord(cells, descCell)
            If descField <> vbNullString Then cellRec("genericField") = descField
            If descText <> vbNullString Then cellRec("description") = descText
        End If
    Next i

    For i = 2 To UBound(relationData, 1)
        Dim relCell As String, relRun As String, relField As String, relIOB As String
        Dim relRec As Object, runMap As Object, runEntry As Object
        relCell = NormalizeCellAddress(CStr(relationData(i, 1)))
        relRun = Trim$(CStr(relationData(i, 2)))
        relField = Trim$(CStr(relationData(i, 3)))
        relIOB = Trim$(CStr(relationData(i, 4)))

        If relCell <> vbNullString Then
            Set relRec = EnsureCellRecord(cells, relCell)
            Set runMap = relRec("runs")
            If relRun <> vbNullString Then AddUniqueKey runs, relRun

            Set runEntry = CreateObject("Scripting.Dictionary")
            runEntry.Add "field", relField
            runEntry.Add "iob", relIOB
            If runMap.Exists(relRun) Then runMap.Remove relRun
            runMap.Add relRun, runEntry
        End If
    Next i

    For i = 2 To UBound(formulaData, 1)
        Dim fCell As String, fSheet As String, fFormula As String
        Dim refs As Variant, funcs As Variant, fRec As Object, cellInfo As Object
        fCell = NormalizeCellAddress(CStr(formulaData(i, 1)))
        fSheet = Trim$(CStr(formulaData(i, 2)))
        fFormula = Trim$(CStr(formulaData(i, 3)))

        If fCell <> vbNullString Then
            refs = ExtractReferences(fFormula, namedRanges)
            funcs = ExtractFunctions(fFormula)

            Set fRec = CreateObject("Scripting.Dictionary")
            fRec.Add "cell", fCell
            fRec.Add "sheet", fSheet
            fRec.Add "formula", fFormula
            fRec.Add "refs", refs
            fRec.Add "functions", funcs

            If formulas.Exists(fCell) Then formulas.Remove fCell
            formulas.Add fCell, fRec
            formulaCells.Add fCell

            Set cellInfo = EnsureCellRecord(cells, fCell)
            cellInfo("hasFormula") = True

            RegisterDependents dependents, fCell, refs, cells, namedRanges
        End If
    Next i

    Dim runList As Variant, namedRangeList As Variant, formulaCellList As Variant
    runList = SortedDictionaryKeys(runs)
    namedRangeList = SortedDictionaryKeys(namedRanges)
    formulaCellList = CollectionToStringArray(formulaCells)

    jsonText = BuildV1SummaryJson(runList, cells, formulas, formulaCellList, dependents, namedRangeList)

    outPath = Application.GetSaveAsFilename( _
        InitialFileName:=DefaultJsonPath(wb), _
        FileFilter:="JSON Files (*.json), *.json", _
        Title:="Save V1Summary.json")

    If VarType(outPath) = vbBoolean And outPath = False Then Exit Sub

    WriteUtf8Text CStr(outPath), jsonText
    MsgBox "V1Summary JSON exported to:" & vbCrLf & CStr(outPath), vbInformation
End Sub

Private Function BuildV1SummaryJson(ByVal runList As Variant, ByVal cells As Object, ByVal formulas As Object, ByVal formulaCellList As Variant, ByVal dependents As Object, ByVal namedRangeList As Variant) As String
    Dim sb As String
    sb = "{"
    sb = sb & vbCrLf & "  ""runs"": " & JsonArray(runList) & ","
    sb = sb & vbCrLf & "  ""cells"": " & JsonCellsObject(cells) & ","
    sb = sb & vbCrLf & "  ""formulas"": " & JsonFormulasObject(formulas) & ","
    sb = sb & vbCrLf & "  ""formulaCells"": " & JsonArray(formulaCellList) & ","
    sb = sb & vbCrLf & "  ""dependents"": " & JsonDependentsObject(dependents) & ","
    sb = sb & vbCrLf & "  ""namedRanges"": " & JsonArray(namedRangeList)
    sb = sb & vbCrLf & "}"
    BuildV1SummaryJson = sb
End Function

Private Function JsonCellsObject(ByVal cells As Object) As String
    Dim sb As String, firstCell As Boolean, k As Variant
    firstCell = True
    sb = "{"
    For Each k In cells.Keys
        Dim rec As Object
        Set rec = cells(k)
        If firstCell Then
            sb = sb & vbCrLf
            firstCell = False
        Else
            sb = sb & "," & vbCrLf
        End If
        sb = sb & "    " & JsonString(CStr(k)) & ": " & JsonCellRecord(rec)
    Next k
    If Not firstCell Then sb = sb & vbCrLf & "  "
    sb = sb & "}"
    JsonCellsObject = sb
End Function

Private Function JsonCellRecord(ByVal rec As Object) As String
    Dim sb As String
    Dim hasRuns As Boolean
    hasRuns = rec("runs").Count > 0

    sb = "{"
    sb = sb & vbCrLf & "      ""cell"": " & JsonString(CStr(rec("cell"))) & ","
    sb = sb & vbCrLf & "      ""genericField"": " & JsonString(CStr(rec("genericField"))) & ","
    sb = sb & vbCrLf & "      ""description"": " & JsonString(CStr(rec("description"))) & ","
    sb = sb & vbCrLf & "      ""hasFormula"": " & LCase$(CStr(CBool(rec("hasFormula"))))
    If hasRuns Then
        sb = sb & "," & vbCrLf & "      ""runs"": " & JsonRunMap(rec("runs"))
    End If
    sb = sb & vbCrLf & "    }"
    JsonCellRecord = sb
End Function

Private Function JsonRunMap(ByVal runMap As Object) As String
    Dim sb As String, firstRun As Boolean, k As Variant
    firstRun = True
    sb = "{"
    For Each k In runMap.Keys
        Dim entry As Object
        Set entry = runMap(k)
        If firstRun Then
            sb = sb & vbCrLf
            firstRun = False
        Else
            sb = sb & "," & vbCrLf
        End If
        sb = sb & "        " & JsonString(CStr(k)) & ": {""field"": " & JsonString(CStr(entry("field"))) & ", ""iob"": " & JsonString(CStr(entry("iob"))) & "}"
    Next k
    If Not firstRun Then sb = sb & vbCrLf & "      "
    sb = sb & "}"
    JsonRunMap = sb
End Function

Private Function JsonFormulasObject(ByVal formulas As Object) As String
    Dim sb As String, firstFormula As Boolean, k As Variant
    firstFormula = True
    sb = "{"
    For Each k In formulas.Keys
        Dim rec As Object
        Set rec = formulas(k)
        If firstFormula Then
            sb = sb & vbCrLf
            firstFormula = False
        Else
            sb = sb & "," & vbCrLf
        End If
        sb = sb & "    " & JsonString(CStr(k)) & ": " & JsonFormulaRecord(rec)
    Next k
    If Not firstFormula Then sb = sb & vbCrLf & "  "
    sb = sb & "}"
    JsonFormulasObject = sb
End Function

Private Function JsonFormulaRecord(ByVal rec As Object) As String
    Dim sb As String
    sb = "{"
    sb = sb & vbCrLf & "      ""cell"": " & JsonString(CStr(rec("cell"))) & ","
    sb = sb & vbCrLf & "      ""sheet"": " & JsonString(CStr(rec("sheet"))) & ","
    sb = sb & vbCrLf & "      ""formula"": " & JsonString(CStr(rec("formula"))) & ","
    sb = sb & vbCrLf & "      ""refs"": " & JsonArray(rec("refs")) & ","
    sb = sb & vbCrLf & "      ""functions"": " & JsonArray(rec("functions"))
    sb = sb & vbCrLf & "    }"
    JsonFormulaRecord = sb
End Function

Private Function JsonDependentsObject(ByVal dependents As Object) As String
    Dim sb As String, firstKey As Boolean, k As Variant
    firstKey = True
    sb = "{"
    For Each k In dependents.Keys
        If firstKey Then
            sb = sb & vbCrLf
            firstKey = False
        Else
            sb = sb & "," & vbCrLf
        End If
        sb = sb & "    " & JsonString(CStr(k)) & ": " & JsonArray(SortedDictionaryKeys(dependents(k)))
    Next k
    If Not firstKey Then sb = sb & vbCrLf & "  "
    sb = sb & "}"
    JsonDependentsObject = sb
End Function

Private Sub RegisterDependents(ByVal dependents As Object, ByVal dependentCell As String, ByVal refs As Variant, ByVal cells As Object, ByVal namedRanges As Object)
    Dim i As Long
    If Not IsArray(refs) Then Exit Sub
    For i = LBound(refs) To UBound(refs)
        Dim sourceId As String
        sourceId = CStr(refs(i))
        If sourceId <> vbNullString Then
            If Not dependents.Exists(sourceId) Then dependents.Add sourceId, CreateObject("Scripting.Dictionary")
            If Not dependents(sourceId).Exists(dependentCell) Then dependents(sourceId).Add dependentCell, True
            If Not namedRanges.Exists(sourceId) Then
                Call EnsureCellRecord(cells, sourceId)
            End If
        End If
    Next i
End Sub

Private Function ExtractReferences(ByVal formulaText As String, ByVal namedRanges As Object) As Variant
    Dim cleanText As String
    Dim refs As Object, namedRefs As Variant, cellRefs As Variant
    Dim i As Long

    cleanText = StripQuotedStrings(formulaText)

    Set refs = CreateObject("Scripting.Dictionary")

    cellRefs = ExtractCellRefs(cleanText)
    If IsArray(cellRefs) Then
        For i = LBound(cellRefs) To UBound(cellRefs)
            AddUniqueKey refs, CStr(cellRefs(i))
        Next i
    End If

    namedRefs = ExtractNamedRangeRefs(cleanText, namedRanges)
    If IsArray(namedRefs) Then
        For i = LBound(namedRefs) To UBound(namedRefs)
            AddUniqueKey refs, CStr(namedRefs(i))
        Next i
    End If

    ExtractReferences = DictionaryKeysAsArray(refs)
End Function

Private Function ExtractCellRefs(ByVal formulaText As String) As Variant
    Dim rx As Object, matches As Object, m As Object
    Dim refs As Object
    Set refs = CreateObject("Scripting.Dictionary")

    Set rx = CreateObject("VBScript.RegExp")
    rx.Global = True
    rx.IgnoreCase = True
    rx.Pattern = "(?:'[^']+'!|[A-Za-z_][A-Za-z0-9_\.]*!)?\$?[A-Z]{1,3}\$?\d+"

    Set matches = rx.Execute(formulaText)
    For Each m In matches
        Dim token As String
        token = NormalizeCellAddress(CStr(m.Value))
        If token <> vbNullString Then AddUniqueKey refs, token
    Next m

    ExtractCellRefs = DictionaryKeysAsArray(refs)
End Function

Private Function ExtractFunctions(ByVal formulaText As String) As Variant
    Dim cleanText As String
    Dim rx As Object, matches As Object, m As Object
    Dim funcs As Object

    cleanText = StripQuotedStrings(formulaText)
    Set funcs = CreateObject("Scripting.Dictionary")

    Set rx = CreateObject("VBScript.RegExp")
    rx.Global = True
    rx.IgnoreCase = True
    rx.Pattern = "\b([A-Za-z_][A-Za-z0-9_\.]*)\s*\("

    Set matches = rx.Execute(cleanText)
    For Each m In matches
        Dim fn As String
        fn = CStr(m.SubMatches(0))
        If fn <> vbNullString Then AddUniqueKey funcs, fn
    Next m

    ExtractFunctions = DictionaryKeysAsArray(funcs)
End Function

Private Function ExtractNamedRangeRefs(ByVal formulaText As String, ByVal namedRanges As Object) As Variant
    Dim hits As Object, k As Variant
    Set hits = CreateObject("Scripting.Dictionary")

    For Each k In namedRanges.Keys
        If ContainsWholeToken(formulaText, CStr(k)) Then
            AddUniqueKey hits, CStr(k)
        End If
    Next k

    ExtractNamedRangeRefs = DictionaryKeysAsArray(hits)
End Function

Private Function ContainsWholeToken(ByVal textValue As String, ByVal token As String) As Boolean
    Dim src As String, target As String
    Dim pos As Long
    Dim leftOk As Boolean, rightOk As Boolean

    src = UCase$(textValue)
    target = UCase$(token)
    pos = InStr(1, src, target, vbTextCompare)

    Do While pos > 0
        
        If pos = 1 Then
            leftOk = True
        Else
            leftOk = Not IsNameChar(Mid$(src, pos - 1, 1))
        End If

        If pos + Len(target) - 1 = Len(src) Then
            rightOk = True
        Else
            rightOk = Not IsNameChar(Mid$(src, pos + Len(target), 1))
        End If

        If leftOk And rightOk Then
            ContainsWholeToken = True
            Exit Function
        End If

        pos = InStr(pos + 1, src, target, vbTextCompare)
    Loop
End Function

Private Function IsNameChar(ByVal ch As String) As Boolean
    If ch = vbNullString Then Exit Function
    IsNameChar = (ch Like "[A-Za-z0-9_\.]")
End Function

Private Function StripQuotedStrings(ByVal formulaText As String) As String
    Dim i As Long, ch As String, inside As Boolean, result As String
    For i = 1 To Len(formulaText)
        ch = Mid$(formulaText, i, 1)
        If ch = """" Then
            inside = Not inside
            result = result & " "
        ElseIf inside Then
            result = result & " "
        Else
            result = result & ch
        End If
    Next i
    StripQuotedStrings = result
End Function

Private Function EnsureCellRecord(ByVal cells As Object, ByVal cellAddr As String) As Object
    If Not cells.Exists(cellAddr) Then
        Dim rec As Object
        Set rec = CreateObject("Scripting.Dictionary")
        rec.Add "cell", cellAddr
        rec.Add "genericField", vbNullString
        rec.Add "description", vbNullString
        rec.Add "hasFormula", False
        rec.Add "runs", CreateObject("Scripting.Dictionary")
        cells.Add cellAddr, rec
    End If
    Set EnsureCellRecord = cells(cellAddr)
End Function

Private Function NormalizeCellAddress(ByVal rawText As String) As String
    Dim t As String, bangPos As Long
    t = Trim$(rawText)
    If t = vbNullString Then Exit Function
    bangPos = InStrRev(t, "!")
    If bangPos > 0 Then t = Mid$(t, bangPos + 1)
    t = Replace$(t, "$", vbNullString)
    NormalizeCellAddress = UCase$(t)
End Function

Private Function SortedDictionaryKeys(ByVal dict As Object) As Variant
    Dim arr() As String, i As Long, k As Variant
    If dict.Count = 0 Then
        SortedDictionaryKeys = Array()
        Exit Function
    End If

    ReDim arr(0 To dict.Count - 1)
    i = 0
    For Each k In dict.Keys
        arr(i) = CStr(k)
        i = i + 1
    Next k
    QuickSortStrings arr, LBound(arr), UBound(arr)
    SortedDictionaryKeys = arr
End Function

Private Function CollectionToStringArray(ByVal c As Collection) As Variant
    Dim arr() As String, i As Long
    If c Is Nothing Or c.Count = 0 Then
        CollectionToStringArray = Array()
        Exit Function
    End If
    ReDim arr(0 To c.Count - 1)
    For i = 1 To c.Count
        arr(i - 1) = CStr(c(i))
    Next i
    CollectionToStringArray = arr
End Function

Private Function DictionaryKeysAsArray(ByVal dict As Object) As Variant
    Dim arr() As String, i As Long, k As Variant
    If dict.Count = 0 Then
        DictionaryKeysAsArray = Array()
        Exit Function
    End If

    ReDim arr(0 To dict.Count - 1)
    i = 0
    For Each k In dict.Keys
        arr(i) = CStr(k)
        i = i + 1
    Next k
    DictionaryKeysAsArray = arr
End Function

Private Sub AddUniqueKey(ByVal dict As Object, ByVal keyText As String)
    If keyText = vbNullString Then Exit Sub
    If Not dict.Exists(keyText) Then dict.Add keyText, True
End Sub

Private Function JsonArray(ByVal values As Variant) As String
    Dim sb As String, i As Long
    sb = "["
    If IsArray(values) Then
        For i = LBound(values) To UBound(values)
            If i > LBound(values) Then sb = sb & ", "
            sb = sb & JsonString(CStr(values(i)))
        Next i
    End If
    sb = sb & "]"
    JsonArray = sb
End Function

Private Function JsonString(ByVal value As String) As String
    JsonString = """" & JsonEscape(value) & """"
End Function

Private Function JsonEscape(ByVal value As String) As String
    Dim t As String
    t = value
    t = Replace$(t, Chr$(92), Chr$(92) & Chr$(92))
    t = Replace$(t, Chr$(34), Chr$(92) & Chr$(34))
    t = Replace$(t, "/", "\/")
    t = Replace$(t, vbBack, "\b")
    t = Replace$(t, vbFormFeed, "\f")
    t = Replace$(t, vbCrLf, "\n")
    t = Replace$(t, vbCr, "\n")
    t = Replace$(t, vbLf, "\n")
    t = Replace$(t, vbTab, "\t")
    JsonEscape = t
End Function

Private Function DefaultJsonPath(ByVal wb As Workbook) As String
    Dim basePath As String
    If wb.Path <> vbNullString Then
        basePath = wb.Path & Application.PathSeparator & "V1Summary.json"
    Else
        basePath = Environ$("USERPROFILE") & Application.PathSeparator & "Desktop" & Application.PathSeparator & "V1Summary.json"
    End If
    DefaultJsonPath = basePath
End Function

Private Sub WriteUtf8Text(ByVal filePath As String, ByVal textValue As String)
    Dim stm As Object
    Set stm = CreateObject("ADODB.Stream")
    stm.Type = 2
    stm.Charset = "utf-8"
    stm.Open
    stm.WriteText textValue
    stm.SaveToFile filePath, 2
    stm.Close
End Sub

Private Function GetWorksheetByName(ByVal wb As Workbook, ByVal sheetName As String) As Worksheet
    On Error Resume Next
    Set GetWorksheetByName = wb.Worksheets(sheetName)
    On Error GoTo 0
    If GetWorksheetByName Is Nothing Then
        Err.Raise vbObjectError + 1000, , "Worksheet not found: " & sheetName
    End If
End Function

Private Sub ValidateHeader(ByVal ws As Worksheet, ByVal expectedHeaders As Variant)
    Dim i As Long, actualHeader As String
    For i = LBound(expectedHeaders) To UBound(expectedHeaders)
        actualHeader = Trim$(CStr(ws.Cells(1, i + 1).Value))
        If UCase$(actualHeader) <> UCase$(CStr(expectedHeaders(i))) Then
            Err.Raise vbObjectError + 1001, , "Unexpected header on sheet '" & ws.Name & "' in column " & (i + 1) & ". Expected '" & expectedHeaders(i) & "' but found '" & actualHeader & "'."
        End If
    Next i
End Sub

Private Function UsedRangeValues(ByVal ws As Worksheet) As Variant
    Dim ur As Range
    Set ur = ws.UsedRange
    If ur.Rows.Count = 1 And ur.Columns.Count = 1 Then
        Dim singleData(1 To 1, 1 To 1) As Variant
        singleData(1, 1) = ur.Value
        UsedRangeValues = singleData
    Else
        UsedRangeValues = ur.Value
    End If
End Function

Private Sub QuickSortStrings(ByRef arr() As String, ByVal first As Long, ByVal last As Long)
    Dim i As Long, j As Long
    Dim pivot As String, temp As String

    i = first
    j = last
    pivot = arr((first + last) \ 2)

    Do While i <= j
        Do While arr(i) < pivot
            i = i + 1
        Loop
        Do While arr(j) > pivot
            j = j - 1
        Loop
        If i <= j Then
            temp = arr(i)
            arr(i) = arr(j)
            arr(j) = temp
            i = i + 1
            j = j - 1
        End If
    Loop

    If first < j Then QuickSortStrings arr, first, j
    If i < last Then QuickSortStrings arr, i, last
End Sub

