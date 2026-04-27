import { PageHeader } from '@/shared/components/page-header';
import { UsersTable } from '@/features/users';

function AdminUsersPage() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <PageHeader
        title="Users"
        description="Manage users and their accounts"
      />
      <UsersTable />
    </div>
  );
}

export default AdminUsersPage;
