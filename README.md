# docbase-treeview
DocBaseに擬似的に階層構造を導入し，ツリーとして表示できるようにするChrome Extensionです。  

![image](https://github.com/gen6033/docbase-treeview/assets/1780508/03e9c932-8ba2-4dd0-8661-7838393762ed)

## 使い方
次のマーカーをページの先頭に挿入することで，親ページを指定することができます。
```
DocBaseTreeViewParentMarker:
#{親ページのID}
```
親ページがない，すなわちルート直下のページの場合は，次のように指定します。
```
DocBaseTreeViewParentMarker: Root
```


`子ページを作成`ボタンを押すことで，，現在のページを親とするマーカーが挿入された状態のページを作成できます。
