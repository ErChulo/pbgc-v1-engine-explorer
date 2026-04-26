'Dependencias:
'Grafo_prueba
'ReportGrafo
	'DoesSheetExist

'Clase ARISTA_DIRIGIDA
'----------------------------
'Con la hoja activa, corre Grafo_prueba. Tiene que ponerse todo el codigo en la hoja de Excel, no puede usarse en la hoja de Macros Personal. Selecciona la segunda fila completa y corre Grafo_Prueba. Aparecera una pestana nueva con el nombre 'Grafo'.

Option Explicit
Sub Grafo_prueba()
   
Dim zonaConFormulas As Range
Set zonaConFormulas = Selection.SpecialCells(xlCellTypeFormulas, 23)
   
Dim Grafo_Dirigido As Collection
Set Grafo_Dirigido = New Collection

Dim r As Range
Dim p As Range

For Each r In zonaConFormulas
   On Error Resume Next
   For Each p In r.DirectPrecedents
   
      Dim arista As ARISTA_DIRIGIDA
      Set arista = New ARISTA_DIRIGIDA
      arista.NodoInicial = p.Address
      arista.NodoDestino = r.Address
      Grafo_Dirigido.Add arista
   
   Next p
Next r

Call ReportGrafo(Grafo_Dirigido)
End Sub

Sub ReportGrafo(Grafo As Collection)
'Para uso del sub Crear???

Application.DisplayAlerts = False
'Si Formulas existe borrala
If DoesSheetExists("Grafo") Then
Sheets("Grafo").Delete
End If

'Crear hoja para depositar Formulas
ThisWorkbook.Sheets.Add
ThisWorkbook.ActiveSheet.Name = "Grafo"

With ActiveSheet
 .Rows(1).Font.Bold = True
 .Range("A1:B1").Value = _
 Array("INICIAL", "FINAL")
 Dim i As Integer
 For i = 1 To Grafo.Count
 .Cells(i + 1, 1) = Grafo(i).NodoInicial
 .Cells(i + 1, 2) = Grafo(i).NodoDestino
 Next
 .Range("A1").CurrentRegion.Columns.AutoFit
End With
Application.DisplayAlerts = True
End Sub

Function DoesSheetExists(sh As String) As Boolean
    Dim ws As Worksheet

    On Error Resume Next
    Set ws = ThisWorkbook.Sheets(sh)
    On Error GoTo 0

    If Not ws Is Nothing Then DoesSheetExists = True
End Function

'***************************
'CLASS ARISTA_DIRIGIDA
'***************************
Option Explicit

Public NodoInicial As String
Public NodoDestino As String




	