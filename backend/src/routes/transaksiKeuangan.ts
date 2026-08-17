import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { getTransaksi, createTransaksi, updateTransaksi, deleteTransaksi, getRekap, getKategoriList } from '../controllers/transaksiKeuanganController';

const router = Router();
router.use(authenticate);

router.get('/kategori',    authorize('admin', 'keuangan'), getKategoriList);
router.get('/rekap',       authorize('admin', 'keuangan'), getRekap);
router.get('/',            authorize('admin', 'keuangan'), getTransaksi);
router.post('/',           authorize('keuangan', 'admin'), createTransaksi);
router.put('/:id',         authorize('keuangan', 'admin'), updateTransaksi);
router.delete('/:id',      authorize('admin'),             deleteTransaksi);

export default router;
