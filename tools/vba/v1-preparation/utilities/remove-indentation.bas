Sub RemoveIndentation()
'Select cell or range of cells that contain indentation layout and remove the indentation by removing the carriage returns and extra spaces.


    Dim Rng As Range
Dim InputRng As Range
  Dim xTitleId  As String
  xTitleId = "Remove All Indentation"
    
    Set InputRng = Application.Selection
Set InputRng = Application.InputBox("Select range to be cleaned of indentations...", xTitleId, InputRng.Address, Type:=8)
    Application.ScreenUpdating = False
    
    For Each Rng In InputRng.Columns(1).Cells

    InputRng.Replace what:=" ", replacement:="", LookAt:=xlPart, SearchOrder:= _
        xlByRows, MatchCase:=False, SearchFormat:=False, ReplaceFormat:=False
    InputRng.Replace what:="" & Chr(10) & "", replacement:="", LookAt:=xlPart, SearchOrder:= _
        xlByRows, MatchCase:=False, SearchFormat:=False, ReplaceFormat:=False
        
Next
    
    
End Sub
