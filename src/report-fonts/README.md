# Fonts for the browser PDF export

The fonts derive from the Google Fonts repository at revision `cc5661d43cd4f9aad5567033a8e15ca28dc35c86`. Every bundled font has an accompanying SIL Open Font License notice.

- Inter Regular and Semibold use the static optical size 14 instance of `ofl/inter/Inter[opsz,wght].ttf` at weights 400 and 650. The build preparation removed hinting and retained the Unicode repertoire. [Inter licence](Inter-OFL.txt)
- Noto Sans SC uses a static weight 400 instance of `ofl/notosanssc/NotoSansSC[wght].ttf`. The offline character set uses GB2312, JIS X 0208, the main Big5 ideographs, basic Latin, kana and common East Asian punctuation. Preparation removed hinting. The font loads only for a workspace containing Han or kana characters. [Noto licence](Noto-OFL.txt)

The renderer embeds the prepared static files for reliable rendering in Chromium and Poppler. Font assets ship with the application.
