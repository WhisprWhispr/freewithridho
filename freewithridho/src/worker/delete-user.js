export async function deleteUser(request, env) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    const authHeader = request.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers });
    }

    // Karena Firebase Admin tidak didukung penuh di Cloudflare Workers murni,
    // fungsi deleteUser via Admin API memerlukan JWT signing dari Service Account.
    // Sebagai alternatif sementara, fitur penghapusan user disarankan dilakukan via Firebase Console.
    
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'Fitur Hapus Akun dari Admin Panel sementara dinonaktifkan pada versi Cloudflare Workers. Silakan hapus user langsung dari Firebase Console.' 
    }), { status: 501, headers });

  } catch (error) {
    console.error('Error deleting user:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
}
