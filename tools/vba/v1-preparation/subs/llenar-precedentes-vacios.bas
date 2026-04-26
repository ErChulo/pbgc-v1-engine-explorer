Sub LlenarPrecedentesVacios()

' Habiendo seleccionado las celdas vacias en la columna Inicial (Grafo_Prueba), corre este sub para llenarlos todos con alguna etiqueta, ig, (vacio).

Dim r As Range
For Each r In Selection
    r.Value = "(void)"
Next r

End Sub