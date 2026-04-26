VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} frmV1Progress 
   Caption         =   "UserForm1"
   ClientHeight    =   3015
   ClientLeft      =   120
   ClientTop       =   465
   ClientWidth     =   4560
   OleObjectBlob   =   "frmV1Progress.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "frmV1Progress"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Option Explicit

Private lblTitle As Object
Private lblStep As Object
Private lblDetail As Object
Private lblPercent As Object
Private lblBack As Object
Private lblBar As Object
Private lblFooter As Object

Private Sub UserForm_Initialize()

    Me.Caption = "V1 Engine Summary Export"
    Me.BackColor = RGB(28, 30, 34)
    Me.Width = 430
    Me.Height = 185

    Set lblTitle = Me.Controls.Add("Forms.Label.1", "lblTitle", True)
    With lblTitle
        .Left = 22
        .Top = 18
        .Width = 370
        .Height = 22
        .Caption = "Preparing V1 engine export"
        .ForeColor = RGB(245, 245, 245)
        .BackStyle = 0
        .Font.Name = "Segoe UI"
        .Font.Size = 12
        .Font.Bold = True
    End With

    Set lblStep = Me.Controls.Add("Forms.Label.1", "lblStep", True)
    With lblStep
        .Left = 22
        .Top = 50
        .Width = 370
        .Height = 18
        .Caption = "Step 0 of 4"
        .ForeColor = RGB(180, 190, 205)
        .BackStyle = 0
        .Font.Name = "Segoe UI"
        .Font.Size = 9
    End With

    Set lblDetail = Me.Controls.Add("Forms.Label.1", "lblDetail", True)
    With lblDetail
        .Left = 22
        .Top = 72
        .Width = 370
        .Height = 28
        .Caption = "Please wait."
        .ForeColor = RGB(220, 225, 235)
        .BackStyle = 0
        .Font.Name = "Segoe UI"
        .Font.Size = 9
        .WordWrap = True
    End With

    Set lblBack = Me.Controls.Add("Forms.Label.1", "lblBack", True)
    With lblBack
        .Left = 22
        .Top = 112
        .Width = 370
        .Height = 10
        .Caption = vbNullString
        .BackColor = RGB(55, 60, 70)
        .SpecialEffect = fmSpecialEffectFlat
    End With

    Set lblBar = Me.Controls.Add("Forms.Label.1", "lblBar", True)
    With lblBar
        .Left = 22
        .Top = 112
        .Width = 5
        .Height = 10
        .Caption = vbNullString
        .BackColor = RGB(85, 170, 255)
        .SpecialEffect = fmSpecialEffectFlat
    End With

    Set lblPercent = Me.Controls.Add("Forms.Label.1", "lblPercent", True)
    With lblPercent
        .Left = 330
        .Top = 128
        .Width = 62
        .Height = 16
        .Caption = "0%"
        .ForeColor = RGB(180, 190, 205)
        .BackStyle = 0
        .Font.Name = "Segoe UI"
        .Font.Size = 8
        .TextAlign = fmTextAlignRight
    End With

    Set lblFooter = Me.Controls.Add("Forms.Label.1", "lblFooter", True)
    With lblFooter
        .Left = 22
        .Top = 130
        .Width = 295
        .Height = 16
        .Caption = "Excel may appear busy while a step is running."
        .ForeColor = RGB(145, 155, 170)
        .BackStyle = 0
        .Font.Name = "Segoe UI"
        .Font.Size = 8
    End With

End Sub

Public Sub SetProgress( _
    ByVal stepNumber As Long, _
    ByVal stepTotal As Long, _
    ByVal titleText As String, _
    ByVal detailText As String, _
    ByVal percentComplete As Double)

    Dim pct As Double
    Dim maxWidth As Double

    pct = percentComplete

    If pct < 0 Then pct = 0
    If pct > 100 Then pct = 100

    lblTitle.Caption = titleText
    lblStep.Caption = "Step " & CStr(stepNumber) & " of " & CStr(stepTotal)
    lblDetail.Caption = detailText
    lblPercent.Caption = Format$(pct, "0") & "%"

    maxWidth = lblBack.Width

    If pct <= 0 Then
        lblBar.Width = 5
    Else
        lblBar.Width = maxWidth * pct / 100
    End If

    Me.Repaint
    DoEvents

End Sub

Public Sub SetFinished(ByVal finalText As String)

    lblTitle.Caption = "Completed"
    lblStep.Caption = "Step 4 of 4"
    lblDetail.Caption = finalText
    lblPercent.Caption = "100%"
    lblBar.Width = lblBack.Width
    lblFooter.Caption = "Export complete."

    Me.Repaint
    DoEvents

End Sub

Public Sub SetFailed(ByVal failureText As String)

    lblTitle.Caption = "Stopped"
    lblDetail.Caption = failureText
    lblFooter.Caption = "Review the error message."
    lblBar.BackColor = RGB(235, 95, 95)

    Me.Repaint
    DoEvents

End Sub

