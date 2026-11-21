"""Explicitly provision the sole demo administrator. Never embeds a password."""
from getpass import getpass
from sqlalchemy import text
from app.core.database import SessionLocal
from app.services.demo_auth import hash_password
USERNAME='admin.demo'

def main():
    with SessionLocal() as db:
        existing=db.execute(text("SELECT admin_account_id FROM auth.demo_admin_accounts WHERE username=:u"),{'u':USERNAME}).first()
        if existing:
            print('Account already exists. Refusing to overwrite password or role.')
            return
        print('Creating admin.demo. This is a local synthetic-data demonstration account.')
        password=getpass('New password (12-128 characters): ')
        confirm=getpass('Confirm password: ')
        if password != confirm or not 12<=len(password)<=128:
            raise SystemExit('Invalid password or confirmation. Nothing changed.')
        db.execute(text("""INSERT INTO auth.demo_admin_accounts (username,display_name,role,password_hash)
          VALUES (:username,:name,'admin',:hashed)"""),
          {'username':USERNAME,'name':'Quản trị viên Demo','hashed':hash_password(password)})
        db.commit()
        print('Created admin.demo. Keep password private.')

if __name__=='__main__':main()
