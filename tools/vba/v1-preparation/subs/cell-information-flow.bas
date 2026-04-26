Option Explicit
'Crea el arbol de dependencias (flujo de informacion) de una hoja.
Sub CellInformationFlow()
'Debug.Print ActiveSheet.UsedRange.Address
'
''Conjunto usedrange
Dim usedRangeCell As Range, node As Range, pCell As Range
For Each usedRangeCell In ActiveSheet.UsedRange
   'Conjunto DirectPrecedents
   If usedRangeCell.HasFormula Then
      For Each node In usedRangeCell
         On Error Resume Next
         For Each pCell In node.DirectPrecedents
            Debug.Print usedRangeCell.Address, node.Address, pCell.Address
         Next
      Next
      'Debug.Print "===="
   End If

Next
End Sub
