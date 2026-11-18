import React from 'react';
import Editor from 'react-simple-wysiwyg';

/** Batas karakter biografi; harus sama dengan `BATAS_BIO` di server. */
export const BATAS_BIO = 5000;

interface BiodataEditorProps {
  id: string;
  nilai: string;
  onUbah: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Editor biografi berformat (tebal, miring, daftar, tautan).
 *
 * HTML yang dihasilkan dibersihkan ulang di server lewat `bersihkanBio`, jadi
 * editor ini hanya mengatur tampilan, bukan penjaga keamanan.
 */
export const BiodataEditor: React.FC<BiodataEditorProps> = ({
  id,
  nilai,
  onUbah,
  placeholder,
  disabled,
}) => {
  const kelebihan = nilai.length > BATAS_BIO;

  return (
    <div className="bio-editor">
      <Editor
        id={id}
        value={nilai}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onUbah(event.target.value)}
      />
      <p
        className={`mt-1 text-right text-[11px] tabular-nums ${
          kelebihan ? 'text-[#B91C1C] font-semibold' : 'text-[#94A3B8]'
        }`}
      >
        {nilai.length.toLocaleString('id-ID')} / {BATAS_BIO.toLocaleString('id-ID')} karakter
      </p>
    </div>
  );
};