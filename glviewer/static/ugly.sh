echo "// auto generated: slide atlas" > css/sa.css
cat css/main.css >> css/sa.css
cat css/saViewer.css >> css/sa.css
cat ../../slideatlas/static/thirdparty/jquery-ui/1.8.22/jquery-ui.css >> css/sa.css
cat ../../slideatlas/static/thirdparty/spectrum/spectrum.css >> css/sa.css
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/jquery-ui/1.8.22/jquery-ui.min.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/spectrum/spectrum.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/glmatrix/0.9.5-r1/glMatrix-min.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/webgl-utils/webgl-utils.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/blob/g7246d68/Blob.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/canvas-toblob/g911df56/canvas-toBlob.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/filesaver/g4d049e9/FileSaver.js >> sa.min.js
~/bin/uglifyjs -nc ../../slideatlas/static/thirdparty/bson/0.2.9/bson.js >> sa.min.js
~/bin/uglifyjs -nc websocket.js >> sa.min.js
~/bin/uglifyjs -nc cookies.js >> sa.min.js 
~/bin/uglifyjs -nc viewEditMenu.js >> sa.min.js 
~/bin/uglifyjs -nc viewBrowser.js >> sa.min.js 
~/bin/uglifyjs -nc dualViewWidget.js >> sa.min.js 
~/bin/uglifyjs -nc tabbedDiv.js >> sa.min.js 
~/bin/uglifyjs -nc note.js >> sa.min.js 
~/bin/uglifyjs -nc notesWidget.js >> sa.min.js 
~/bin/uglifyjs -nc tab.js >> sa.min.js 
~/bin/uglifyjs -nc annotationWidget.js >> sa.min.js 
~/bin/uglifyjs -nc recorderWidget.js >> sa.min.js 
~/bin/uglifyjs -nc navigationWidget.js >> sa.min.js 
~/bin/uglifyjs -nc favoritesWidget.js >> sa.min.js 
~/bin/uglifyjs -nc favoritesBar.js >> sa.min.js 
~/bin/uglifyjs -nc mobileAnnotationWidget.js >> sa.min.js 
~/bin/uglifyjs -nc stackSectionWidget.js >> sa.min.js 
~/bin/uglifyjs -nc sectionsWidget.js >> sa.min.js 
~/bin/uglifyjs -nc viewer-utils.js >> sa.min.js 
~/bin/uglifyjs -nc presentation.js >> sa.min.js 
~/bin/uglifyjs -nc loader.js >> sa.min.js 
~/bin/uglifyjs -nc camera.js >> sa.min.js 
~/bin/uglifyjs -nc cutout.js >> sa.min.js 
~/bin/uglifyjs -nc seedContour.js >> sa.min.js 
~/bin/uglifyjs -nc align.js >> sa.min.js 
~/bin/uglifyjs -nc dialog.js >> sa.min.js 
~/bin/uglifyjs -nc tile.js >> sa.min.js 
~/bin/uglifyjs -nc cache.js >> sa.min.js 
~/bin/uglifyjs -nc section.js >> sa.min.js 
~/bin/uglifyjs -nc view.js >> sa.min.js 
~/bin/uglifyjs -nc annotationLayer.js >> sa.min.js 
~/bin/uglifyjs -nc viewer.js >> sa.min.js 
~/bin/uglifyjs -nc pairTransformation.js >> sa.min.js 
~/bin/uglifyjs -nc presentation.js >> sa.min.js 
~/bin/uglifyjs -nc loader.js >> sa.min.js 
~/bin/uglifyjs -nc camera.js >> sa.min.js 
~/bin/uglifyjs -nc cutout.js >> sa.min.js 
~/bin/uglifyjs -nc seedContour.js >> sa.min.js 
~/bin/uglifyjs -nc align.js >> sa.min.js 
~/bin/uglifyjs -nc dialog.js >> sa.min.js 
~/bin/uglifyjs -nc tile.js >> sa.min.js 
~/bin/uglifyjs -nc cache.js >> sa.min.js 
~/bin/uglifyjs -nc section.js >> sa.min.js 
~/bin/uglifyjs -nc view.js >> sa.min.js 
~/bin/uglifyjs -nc viewer.js >> sa.min.js 
~/bin/uglifyjs -nc pairTransformation.js >> sa.min.js 
~/bin/uglifyjs -nc cutoutWidget.js >> sa.min.js 
~/bin/uglifyjs -nc text.js >> sa.min.js 
~/bin/uglifyjs -nc textWidget.js >> sa.min.js 
~/bin/uglifyjs -nc polyline.js >> sa.min.js
~/bin/uglifyjs -nc polylineWidget.js >> sa.min.js
~/bin/uglifyjs -nc pencilWidget.js >> sa.min.js 
~/bin/uglifyjs -nc fillWidget.js >> sa.min.js 
~/bin/uglifyjs -nc lassoWidget.js >> sa.min.js 
~/bin/uglifyjs -nc widgetPopup.js >> sa.min.js 
~/bin/uglifyjs -nc shape.js >> sa.min.js 
~/bin/uglifyjs -nc shapeGroup.js >> sa.min.js 
~/bin/uglifyjs -nc crossHairs.js >> sa.min.js 
~/bin/uglifyjs -nc arrow.js >> sa.min.js 
~/bin/uglifyjs -nc arrowWidget.js >> sa.min.js 
~/bin/uglifyjs -nc circle.js >> sa.min.js 
~/bin/uglifyjs -nc circleWidget.js >> sa.min.js 
~/bin/uglifyjs -nc rectWidget.js >> sa.min.js 
~/bin/uglifyjs -nc gridWidget.js >> sa.min.js 
~/bin/uglifyjs -nc scaleWidget.js >> sa.min.js 
~/bin/uglifyjs -nc cutoutWidget.js >> sa.min.js 
~/bin/uglifyjs -nc imageAnnotation.js >> sa.min.js 
~/bin/uglifyjs -nc init.js >> sa.min.js 


