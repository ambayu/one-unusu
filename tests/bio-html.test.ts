import assert from 'node:assert/strict';
import { BATAS_BIO, bersihkanBio, bioKeTeks } from '../src/server/lib/bioHtml.js';

assert.equal(
  bersihkanBio('<p>Halo <b>dunia</b><script>alert(1)</script></p>'),
  '<p>Halo <strong>dunia</strong></p>',
);
assert.equal(
  bersihkanBio('<p onclick="alert(1)">Aman</p>'),
  '<p>Aman</p>',
);
assert.equal(
  bersihkanBio('<a href="javascript:alert(1)" onmouseover="x()">Klik</a>'),
  '<a target="_blank" rel="noopener noreferrer">Klik</a>',
);
assert.equal(
  bersihkanBio('<a href="https://unusu.ac.id">Situs</a>'),
  '<a href="https://unusu.ac.id" target="_blank" rel="noopener noreferrer">Situs</a>',
);
assert.equal(
  bersihkanBio('<ul><li>satu</li><li>dua</li></ul>'),
  '<ul><li>satu</li><li>dua</li></ul>',
);
assert.equal(bersihkanBio('   <p> </p>  '), '');
assert.equal(bersihkanBio('<br>'), '');
assert.equal(bersihkanBio('<p>x</p>'.repeat(BATAS_BIO)).length, BATAS_BIO);

assert.equal(bioKeTeks(null), null);
assert.equal(bioKeTeks(''), null);
assert.equal(bioKeTeks('<p></p>'), null);
assert.equal(bioKeTeks('<p>Satu</p><p>Dua</p>'), 'Satu\nDua');
assert.equal(bioKeTeks('<p>Satu<br>Dua</p>'), 'Satu\nDua');
assert.equal(bioKeTeks('<ul><li>satu</li><li>dua</li></ul>'), '• satu\n• dua');
assert.equal(bioKeTeks('<p>R&amp;D</p>'), 'R&D');
assert.equal(bioKeTeks('Teks polos <b>lama</b>'), 'Teks polos lama');

console.log('bio-html: ok');
