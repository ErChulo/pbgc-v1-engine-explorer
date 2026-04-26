Perfecto. A continuación te presento una versión extendida del código en VBA que:
	1.	Lee el grafo de dependencias con pesos desde la hoja "Dependencias", ahora con columnas:
	•	A: Nodo origen (From)
	•	B: Nodo destino (To)
	•	C: Peso numérico (por ejemplo, el coeficiente de influencia)
	2.	Usa una adaptación de Dijkstra para calcular la distancia mínima ponderada entre nodos.
	3.	Si ya existe la hoja "Distancias", la elimina primero antes de escribir los nuevos resultados.

⸻

Código VBA extendido con pesos y eliminación previa

Sub CalcularMatrizDistanciasPonderadas()

    Dim dictAdj As Object
    Set dictAdj = CreateObject("Scripting.Dictionary")
    
    Dim dictNodes As Object
    Set dictNodes = CreateObject("Scripting.Dictionary")
    
    Dim wsDep As Worksheet
    Set wsDep = ThisWorkbook.Sheets("Dependencias")
    
    Dim lastRow As Long
    lastRow = wsDep.Cells(wsDep.Rows.Count, "A").End(xlUp).Row
    
    Dim i As Long
    Dim fromNode As String, toNode As String
    Dim peso As Double
    
    ' Leer dependencias con pesos y construir grafo
    For i = 2 To lastRow
        fromNode = Trim(wsDep.Cells(i, 1).Value)
        toNode = Trim(wsDep.Cells(i, 2).Value)
        peso = CDbl(wsDep.Cells(i, 3).Value)
        
        If Not dictAdj.exists(fromNode) Then
            Set dictAdj(fromNode) = CreateObject("Scripting.Dictionary")
        End If
        dictAdj(fromNode)(toNode) = peso
        
        ' Agregar nodos únicos
        If Not dictNodes.exists(fromNode) Then dictNodes(fromNode) = True
        If Not dictNodes.exists(toNode) Then dictNodes(toNode) = True
    Next i
    
    Dim nodeList() As String
    ReDim nodeList(0 To dictNodes.Count - 1)
    
    i = 0
    Dim key As Variant
    For Each key In dictNodes.Keys
        nodeList(i) = key
        i = i + 1
    Next key
    
    Dim numNodes As Long
    numNodes = UBound(nodeList)
    
    ' Eliminar hoja si ya existe
    Dim wsOut As Worksheet
    On Error Resume Next
    Application.DisplayAlerts = False
    Worksheets("Distancias").Delete
    Application.DisplayAlerts = True
    On Error GoTo 0
    
    Set wsOut = Worksheets.Add
    wsOut.Name = "Distancias"
    
    ' Encabezados
    For i = 0 To numNodes
        wsOut.Cells(1, i + 2).Value = nodeList(i)
        wsOut.Cells(i + 2, 1).Value = nodeList(i)
    Next i
    
    ' Dijkstra para distancias ponderadas
    Dim srcIdx As Long, tgtIdx As Long
    Dim dist() As Double
    ReDim dist(0 To numNodes, 0 To numNodes)
    
    For srcIdx = 0 To numNodes
        Dim distMap As Object
        Set distMap = CreateObject("Scripting.Dictionary")
        
        Dim visited As Object
        Set visited = CreateObject("Scripting.Dictionary")
        
        ' Inicializar distancias
        For i = 0 To numNodes
            distMap(nodeList(i)) = 1E+99
        Next i
        distMap(nodeList(srcIdx)) = 0
        
        Do
            Dim minNode As String
            Dim minDist As Double
            minDist = 1E+99
            minNode = ""
            
            ' Buscar nodo no visitado con menor distancia
            For Each key In distMap.Keys
                If Not visited.exists(key) Then
                    If distMap(key) < minDist Then
                        minDist = distMap(key)
                        minNode = key
                    End If
                End If
            Next key
            
            If minNode = "" Then Exit Do
            
            visited(minNode) = True
            
            If dictAdj.exists(minNode) Then
                Dim neighbors As Object
                Set neighbors = dictAdj(minNode)
                For Each toNode In neighbors.Keys
                    If Not visited.exists(toNode) Then
                        Dim alt As Double
                        alt = distMap(minNode) + neighbors(toNode)
                        If alt < distMap(toNode) Then
                            distMap(toNode) = alt
                        End If
                    End If
                Next toNode
            End If
        Loop
        
        ' Registrar resultados
        For tgtIdx = 0 To numNodes
            Dim finalDist As Double
            finalDist = distMap(nodeList(tgtIdx))
            If finalDist = 1E+99 Then
                dist(srcIdx, tgtIdx) = -1 ' No alcanzable
            Else
                dist(srcIdx, tgtIdx) = finalDist
            End If
            wsOut.Cells(srcIdx + 2, tgtIdx + 2).Value = dist(srcIdx, tgtIdx)
        Next tgtIdx
    Next srcIdx
    
    MsgBox "Matriz de distancias ponderadas creada en la hoja 'Distancias'."

End Sub



⸻

Formato esperado en hoja Dependencias

A	B	C
From	To	Peso
A1	A3	1.0
A2	A4	2.5
A3	A5	1.3
A4	A5	0.7



⸻

¿Deseas que el código también coloree celdas con nodos no conectados o diagonales con cero? ¿O exportar la matriz a CSV directamente?