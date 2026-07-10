<%
Response.ContentType = "application/json"
Response.CharSet = "UTF-8"
Response.Expires = -1
Response.ExpiresAbsolute = Now() - 1
Response.AddHeader "pragma","no-cache"
Response.AddHeader "cache-control","private, no-cache, no-store, must-revalidate"

' Enable Error Handling
' On Error Resume Next

Dim action, dictPath, fso, file, line, parts, lineKey, lineVal
action = Request.QueryString("action")
dictPath = Server.MapPath("nhaptat.txt")

Set fso = Server.CreateObject("Scripting.FileSystemObject")

' Helper to read nhaptat.txt into a Scripting.Dictionary
Function ReadDictionary()
    Dim d
    Set d = Server.CreateObject("Scripting.Dictionary")
    If fso.FileExists(dictPath) Then
        Dim f
        Set f = fso.OpenTextFile(dictPath, 1, False, 0) ' 1 = ForReading, 0 = ASCII/System Default
        
        Do Until f.AtEndOfStream
            line = Trim(f.ReadLine)
            If line <> "" And Left(line, 1) <> "#" Then
                parts = Split(line, "=")
                If UBound(parts) >= 1 Then
                    lineKey = Trim(parts(0))
                    ' Re-join values if there are multiple "=" signs
                    lineVal = ""
                    Dim j
                    For j = 1 To UBound(parts)
                        If j > 1 Then lineVal = lineVal & "="
                        lineVal = lineVal & parts(j)
                    Next
                    lineVal = Trim(lineVal)
                    If lineKey <> "" Then
                        If d.Exists(lineKey) Then
                            d(lineKey) = lineVal
                        Else
                            d.Add lineKey, lineVal
                        End If
                    End If
                End If
            End If
        Loop
        f.Close
    End If
    Set ReadDictionary = d
End Function

' Helper to write a Scripting.Dictionary back to nhaptat.txt
Sub WriteDictionary(d)
    Dim f, k
    Set f = fso.OpenTextFile(dictPath, 2, True, 0) ' 2 = ForWriting, True = Create, 0 = ASCII/System Default
    For Each k In d.Keys
        f.WriteLine k & "=" & d(k)
    Next
    f.Close
End Sub

If action = "get" Then
    Dim dictGet, kGet, json, first
    Set dictGet = ReadDictionary()
    
    json = "{"
    first = True
    For Each kGet In dictGet.Keys
        If Not first Then json = json & ","
        ' Simple JSON escaping
        Dim escapedVal
        escapedVal = Replace(dictGet(kGet), "\", "\\")
        escapedVal = Replace(escapedVal, """", "\""")
        escapedVal = Replace(escapedVal, vbCrLf, "\n")
        escapedVal = Replace(escapedVal, vbCr, "\r")
        escapedVal = Replace(escapedVal, vbLf, "\n")
        
        json = json & """" & kGet & """:""" & escapedVal & """"
        first = False
    Next
    json = json & "}"
    Response.Write json

ElseIf action = "getraw" Then
    Response.ContentType = "text/plain"
    If fso.FileExists(dictPath) Then
        Dim fRaw
        Set fRaw = fso.OpenTextFile(dictPath, 1, False, 0) ' 1 = ForReading, 0 = ASCII/System Default
        Response.Write fRaw.ReadAll
        fRaw.Close
    End If

ElseIf action = "saveraw" Then
    Dim rawText, postDataRaw, streamRaw
    Dim totalBytesRaw
    totalBytesRaw = Request.TotalBytes
    If totalBytesRaw > 0 Then
        postDataRaw = Request.BinaryRead(totalBytesRaw)
        
        Set streamRaw = Server.CreateObject("ADODB.Stream")
        streamRaw.Type = 1 ' Binary
        streamRaw.Open
        streamRaw.Write postDataRaw
        streamRaw.Position = 0
        streamRaw.Type = 2 ' Text
        streamRaw.Charset = "utf-8"
        rawText = streamRaw.ReadText
        streamRaw.Close
    End If
    
    If rawText <> "" Then
        Dim fSaveRaw
        Set fSaveRaw = fso.OpenTextFile(dictPath, 2, True, 0) ' 2 = ForWriting, True = Create, 0 = ASCII/System Default
        fSaveRaw.Write rawText
        fSaveRaw.Close
        Response.Write "{""status"":""success""}"
    Else
        Response.Write "{""status"":""error"",""message"":""Empty text""}"
    End If

ElseIf action = "save" Then
    Dim keySave, valSave, dictSave
    keySave = Trim(Request.Form("key"))
    valSave = Trim(Request.Form("val"))
    
    If keySave <> "" Then
        Set dictSave = ReadDictionary()
        If dictSave.Exists(keySave) Then
            dictSave(keySave) = valSave
        Else
            dictSave.Add keySave, valSave
        End If
        Call WriteDictionary(dictSave)
        Response.Write "{""status"":""success""}"
    Else
        Response.Write "{""status"":""error"",""message"":""Key is empty""}"
    End If

ElseIf action = "delete" Then
    Dim keyDel, dictDel
    keyDel = Trim(Request.Form("key"))
    
    If keyDel <> "" Then
        Set dictDel = ReadDictionary()
        If dictDel.Exists(keyDel) Then
            dictDel.Remove keyDel
            Call WriteDictionary(dictDel)
            Response.Write "{""status"":""success""}"
        Else
            Response.Write "{""status"":""error"",""message"":""Key not found""}"
        End If
    Else
        Response.Write "{""status"":""error"",""message"":""Key is empty""}"
    End If

ElseIf action = "merge" Then
    ' Parse simple POST request with JSON
    Dim dictMerge, postData, stream, jsonStr
    Dim totalBytes
    totalBytes = Request.TotalBytes
    If totalBytes > 0 Then
        postData = Request.BinaryRead(totalBytes)
        
        Set stream = Server.CreateObject("ADODB.Stream")
        stream.Type = 1 ' Binary
        stream.Open
        stream.Write postData
        stream.Position = 0
        stream.Type = 2 ' Text
        stream.Charset = "utf-8"
        jsonStr = stream.ReadText
        stream.Close
    End If
    
    If jsonStr <> "" Then
        Set dictMerge = ReadDictionary()
        
        Dim regEx, matches, match, mKey, mVal
        Set regEx = New RegExp
        regEx.Pattern = """([^""]+)""\s*:\s*""([^""]+)"""
        regEx.Global = True
        regEx.IgnoreCase = True
        Set matches = regEx.Execute(jsonStr)
        
        For Each match In matches
            mKey = match.SubMatches(0)
            mVal = match.SubMatches(1)
            
            mVal = Replace(mVal, "\""", """")
            mVal = Replace(mVal, "\\", "\")
            
            mVal = Replace(mVal, ", ", ".")
            mVal = Replace(mVal, ",", ".")
            mVal = Replace(mVal, " ", ".")
            
            If mKey <> "" Then
                If dictMerge.Exists(mKey) Then
                    dictMerge(mKey) = mVal
                Else
                    dictMerge.Add mKey, mVal
                End If
            End If
        Next
        
        Call WriteDictionary(dictMerge)
        Response.Write "{""status"":""success""}"
    Else
        Response.Write "{""status"":""error"",""message"":""Empty JSON""}"
    End If
Else
    Response.Write "{""status"":""error"",""message"":""Unknown action""}"
End If

Set fso = Nothing
%>
