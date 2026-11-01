// Material Web, loaded through the import map in index.html.
// esm.run bundles each entry point on its own, so importing components one by one
// registers shared pieces (md-elevation, md-ripple) twice and throws. all.js is one bundle.
import '@material/web/all.js';
