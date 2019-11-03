FlashPaper
==========

FlashPaper is a micro web application for sending self-destructing messages with end-to-end encryption.

Use it now at [https://flashpaper.coderealms.io](https://flashpaper.coderealms.io)!

How Does It Work?
-----------------

When you create a message with FlashPaper, you get a link that you can send to anyone else (by email, slack, etc.).
When the recipient clicks that link they see the message you sent them but that link can then never be used again. If
the sender, recipient, or anyone else tries to use that link they will only see an error. Messages that have been left
unviewed for 7 days will also be automatically deleted.

To further protect your messages, FlashPaper uses end-to-end encryption meaning that the FlashPaper service never
actually sees your message. When it is created it gets encrypted _in the browser_ before it is sent to FlashPaper and
stored. The decryption key is part of the link sent to the recipient. When a message is viewed, the encrypted version of
it is fetched from the server (assuming it has not already been viewed) and then gets decrypted _in the browser_. Thus,
the server never sees the plaintext message or the decryption key. Only the sender and receiver will ever have the
ability to see the message.

Prior Art
---------
FlashPaper was written from scratch but is based on [go-flashpaper](https://github.com/rawdigits/go-flashpaper) and
[ZeroBin](https://github.com/sebsauvage/ZeroBin). If you are interested in other similar
projects, also check out [Firefox Send](https://send.firefox.com/).</p>

This Repository
---------------

The frontend of this application is static HTML/JavaScript and is hosted on [Github Pages](https://pages.github.com/).
The backend of this application is run on [Heroku](https://www.heroku.com/).

This application is designed so that anyone can fork the repository and run it themselves. You will just need to update
the deployed app script url [here](index.html#L144).
