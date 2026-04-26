'The VBA macro from the example below deletes carriage returns from all cells in the currently opened worksheet (active worksheet).
'The next formula will help you replace line break with any other symbol (comma+space). In this case lines will not join and extra spaces will not 'appear.
'=TRIM(SUBSTITUTE(SUBSTITUTE(B2,CHAR(13),""),CHAR(10),", ")
'If you want to remove all nonprintable characters from text, including line breaks:
'=CLEAN(B2) 



Sub RemoveCarriageReturns()
	Dim MyRange As Range
	Application.ScreenUpdating = False
		Application.Calculation = xlCalculationManual

		For Each MyRange In ActiveSheet.UsedRange
				If 0 < InStr(MyRange, Chr(10)) Then
						MyRange = Replace(MyRange, Chr(10), "")
				End If
		Next

	Application.ScreenUpdating = True
		Application.Calculation = xlCalculationAutomatic
End Sub