package com.tamaos.jetstream;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;

import java.io.File;
import java.io.FileNotFoundException;

/**
 * Minimal read-only content provider for sharing exported save files with
 * other apps (Drive, Files, email) without pulling in androidx FileProvider.
 * Only serves files inside <app files>/exports.
 */
public class SaveFileProvider extends ContentProvider {
    public static final String AUTHORITY = "com.tamaos.jetstream.files";
    private static File exportsDir;

    public static Uri uriFor(File file) {
        return new Uri.Builder().scheme("content").authority(AUTHORITY).appendPath("exports").appendPath(file.getName()).build();
    }

    @Override
    public boolean onCreate() {
        exportsDir = new File(getContext().getFilesDir(), "exports");
        return true;
    }

    private File resolve(Uri uri) throws FileNotFoundException {
        if (uri.getPathSegments().size() != 2 || !"exports".equals(uri.getPathSegments().get(0))) throw new FileNotFoundException(uri.toString());
        File f = new File(exportsDir, uri.getLastPathSegment());
        try {
            if (!f.getCanonicalPath().startsWith(exportsDir.getCanonicalPath())) throw new FileNotFoundException(uri.toString());
        } catch (java.io.IOException e) {
            throw new FileNotFoundException(uri.toString());
        }
        if (!f.exists()) throw new FileNotFoundException(uri.toString());
        return f;
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        return ParcelFileDescriptor.open(resolve(uri), ParcelFileDescriptor.MODE_READ_ONLY);
    }

    @Override
    public Cursor query(Uri uri, String[] projection, String selection, String[] selectionArgs, String sortOrder) {
        File f;
        try { f = resolve(uri); } catch (FileNotFoundException e) { return null; }
        if (projection == null) projection = new String[]{OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE};
        MatrixCursor c = new MatrixCursor(projection, 1);
        Object[] row = new Object[projection.length];
        for (int i = 0; i < projection.length; i++) {
            if (OpenableColumns.DISPLAY_NAME.equals(projection[i])) row[i] = f.getName();
            else if (OpenableColumns.SIZE.equals(projection[i])) row[i] = f.length();
            else row[i] = null;
        }
        c.addRow(row);
        return c;
    }

    @Override
    public String getType(Uri uri) {
        String n = uri.getLastPathSegment();
        if (n != null && n.endsWith(".json")) return "application/json";
        return "application/octet-stream";
    }

    @Override public Uri insert(Uri uri, ContentValues values) { return null; }
    @Override public int delete(Uri uri, String selection, String[] selectionArgs) { return 0; }
    @Override public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) { return 0; }
}
