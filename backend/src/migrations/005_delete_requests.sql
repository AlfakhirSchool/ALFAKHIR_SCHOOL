-- Tabel permintaan hapus data yang membutuhkan persetujuan Admin Master
CREATE TABLE IF NOT EXISTS delete_requests (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id  UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type VARCHAR(50)   NOT NULL,
  resource_id   UUID          NOT NULL,
  resource_name VARCHAR(255)  NOT NULL,
  reason        TEXT,
  status        VARCHAR(20)   DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by   UUID          REFERENCES users(id),
  reviewed_at   TIMESTAMP,
  created_at    TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delete_requests_status ON delete_requests(status);
