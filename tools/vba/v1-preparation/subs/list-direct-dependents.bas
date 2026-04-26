Sub ListDirectDependents()
    Dim rArea As Range
    Dim rCell As Range
    Dim sActiveCell As String
    Dim rPre As Range
    Dim lRow As Long

    On Error Resume Next
    'Set rPre = ActiveCell.Precedents (TODOS LOS PREDECESORES)
    Set rPre = ActiveCell.DirectDependents
    If rPre Is Nothing Then
        MsgBox ActiveCell.Address(False, False) & _
          " has no dependents"
        Exit Sub
    End If

    On Error GoTo 0
    'sActiveCell = ActiveCell.Address(False, False)
    sActiveCell = ActiveCell.Offset(-1, 0).Value & ", Celda " & ActiveCell.Address(False, False)
    Worksheets.Add
    lRow = 1
    Cells(lRow, 1).Value = "Dependientes Directos de " & sActiveCell
    lRow = lRow + 2
    Cells(lRow, 1).Value = "CELDA"
    Cells(lRow, 2).Value = "VARIABLE"
    Cells(lRow, 3).Value = "VALOR"
    
    Range("A3:C3").Select
    Selection.Font.Bold = True
    Selection.Font.Italic = True
    
        For Each rArea In rPre
        For Each rCell In rArea
            lRow = lRow + 1
            Cells(lRow, 1) = rCell.Address(False, False)
            Cells(lRow, 2) = rCell.Offset(-1, 0).Value
            Cells(lRow, 3) = rCell.Value
            
        Next
    Next
    Set rArea = Nothing
    Set rCell = Nothing
    Set rPre = Nothing
    
    Cells.Select
    Cells.EntireColumn.AutoFit
    Range("A1").Select
End Sub