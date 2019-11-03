function decodeStr(str) {
    // Convert the message into a Uint8Array
    var data=new Uint8Array(str.length);
    for(var i=0,j=str.length;i<j;++i){
        data[i]=str.charCodeAt(i);
    }
    return data;
}

function encodeStr(data) {
    var str = '';
    for (var i=0,j=data.length;i<j;++i) {
        str += String.fromCharCode(data[i]);
    }
    return str;
}

function generateKey(onSuccess) {
    window.crypto.subtle.generateKey(
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    ).then(function(key){
        onSuccess(key);
    }).catch(function(err){
        alert(err);
    });
}

function exportKey(key, onSuccess) {
    window.crypto.subtle.exportKey("raw", key)
        .then(function(keydata){
            onSuccess(keydata);
        }).catch(function(err){
            alert(err);
        });
}

function importKey(key, onSuccess) {
    window.crypto.subtle.importKey(
        "raw", key,
        {
            name: "AES-GCM"
        },
        false,
        ["encrypt", "decrypt"]
    ).then(function(key){
        onSuccess(key);
    }).catch(function(err){
        alert(err);
    });
}

// key: result of generateKey or importKey
// data: TypedArray of data to be encrypted
// returns: an TypedArray containing the encrypted data
function encrypt(key, data, onSuccess) {
    var iv = window.crypto.getRandomValues(new Uint8Array(12));
    window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        data.buffer
    ).then(function(encrypted) {
        var result = new Uint8Array(iv.length + encrypted.byteLength);
        result.set(iv, 0);
        result.set(new Uint8Array(encrypted), iv.length);
        onSuccess(result);
    }).catch(function(err) {
        alert(err);
    });
}

// key: result of generateKey or importKey
// data: TypedArray of data to be decrypted
// returns: an TypedArray containing the decrypted data
function decrypt(key, data, onSuccess) {
    var iv = new Uint8Array(12);
    iv.set(data.subarray(0, iv.length), 0);
    var encrypted = new Uint8Array(data.length - iv.length);
    encrypted.set(data.subarray(iv.length), 0);

    window.crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        key,
        encrypted.buffer
    ).then(function(decrypted){
        onSuccess(new Uint8Array(decrypted));
    }).catch(function(err){
        alert(err);
    });
}
