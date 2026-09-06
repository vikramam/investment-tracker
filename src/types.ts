export type FamilyMember = {
  id: string;
  name: string;
  phone: string | null;
  note: string | null;
};

export type DepositStatus = 'active' | 'closed';

export type Deposit = {
  id: string;
  member_id: string;
  principal_amount: number; // paise
  interest_rate: number; // e.g. 0.02 for 2%
  deposit_date: string; // ISO date
  status: DepositStatus;
};

export type Withdrawal = {
  id: string;
  deposit_id: string;
  amount: number; // paise
  withdrawal_date: string; // ISO date
  collected_by: string; // family_members.id
  note: string | null;
};

export type PayoutStatus = 'pending' | 'collected';

export type InterestPayout = {
  id: string;
  deposit_id: string;
  due_date: string; // ISO date
  amount: number; // paise, snapshotted at generation time
  status: PayoutStatus;
  collected_date: string | null;
  collected_by: string | null;
};

// ---- Assembled client-side shapes (not separate DB tables) ----

export type DepositWithHistory = Deposit & {
  withdrawals: Withdrawal[];
  payouts: InterestPayout[];
};

export type MemberWithDeposits = FamilyMember & {
  deposits: DepositWithHistory[];
};

export type PendingPayoutRow = InterestPayout & {
  memberId: string;
  memberName: string;
};
