'Esta funcion escupe un vector de argumentos de funciones, i.e., SUM(A1,B1) -> A1, B1
'Es pa usarse con lo que escupe CleanFunctionNames()
Function Arguments(CellValue As Range) As Variant
    Dim regEx As RegExp
    Dim Expr As String
    Set regEx = New RegExp
    
'Comillas dobles tienen que ser procesadas asi...
Dim comillas As String
comillas = Chr(34) 'Codigo ASCII de comillas
    
    Expr = "\-?[A-Z0-9" & comillas & "_.\s'\$]*[^,#()&@=/<>*+^-]"
    regEx.Global = True
    regEx.IgnoreCase = False
    regEx.MultiLine = True
    regEx.Pattern = Expr
    
'Get back all the occurrences
Dim mc As MatchCollection
Set mc = regEx.Execute(CellValue)
Dim n As Integer

Dim vector() As String
n = mc.Count
ReDim vector(0 To n - 1)
Dim i As Integer
For i = 0 To n - 1

   vector(i) = mc.item(i).Value

Next i
    Arguments = vector
End Function

