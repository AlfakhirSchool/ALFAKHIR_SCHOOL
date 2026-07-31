import { Model, Optional } from 'sequelize';
interface ActivityLogAttributes {
    id: string;
    user_id: string | null;
    nama: string | null;
    role: string | null;
    school_level: string | null;
    app_source: string | null;
    action: string;
    table_name: string | null;
    record_id: string | null;
    old_value: object | null;
    new_value: object | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at?: Date;
}
interface ActivityLogCreationAttributes extends Optional<ActivityLogAttributes, 'id' | 'user_id' | 'nama' | 'role' | 'school_level' | 'app_source' | 'table_name' | 'record_id' | 'old_value' | 'new_value' | 'ip_address' | 'user_agent'> {
}
declare class ActivityLog extends Model<ActivityLogAttributes, ActivityLogCreationAttributes> implements ActivityLogAttributes {
    id: string;
    user_id: string | null;
    nama: string | null;
    role: string | null;
    school_level: string | null;
    app_source: string | null;
    action: string;
    table_name: string | null;
    record_id: string | null;
    old_value: object | null;
    new_value: object | null;
    ip_address: string | null;
    user_agent: string | null;
    readonly created_at: Date;
}
export default ActivityLog;
