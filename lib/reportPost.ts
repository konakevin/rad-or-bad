import { showAlert } from '@/components/CustomAlert';
import { supabase } from '@/lib/supabase';

export function reportPost(
  uploadId: string,
  reporterId: string,
  onComplete?: () => void,
) {
  showAlert('Report Post', 'Why are you reporting this?', [
    { text: 'Spam', style: 'destructive', onPress: () => submit(uploadId, reporterId, 'spam', onComplete) },
    { text: 'Inappropriate content', style: 'destructive', onPress: () => submit(uploadId, reporterId, 'inappropriate', onComplete) },
    { text: 'Harassment or bullying', style: 'destructive', onPress: () => submit(uploadId, reporterId, 'harassment', onComplete) },
    { text: 'Cancel', style: 'cancel' },
  ]);
}

async function submit(uploadId: string, reporterId: string, reason: string, onComplete?: () => void) {
  await supabase.from('reports').insert({
    reporter_id: reporterId,
    upload_id: uploadId,
    reason,
  });
  showAlert('Reported', 'Thanks for letting us know. We\'ll review this post.', [
    { text: 'OK', onPress: () => onComplete?.() },
  ]);
}
