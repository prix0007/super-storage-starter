use borsh::{ BorshDeserialize, BorshSerialize };
use solana_program::{
    log::sol_log_compute_units,
    account_info::{ next_account_info, AccountInfo },
    entrypoint,
    entrypoint::ProgramResult,
    msg,
    program_error::ProgramError,
    pubkey::Pubkey,
};
// use std::io::ErrorKind::InvalidData;

#[derive(BorshSerialize, BorshDeserialize, Debug)]
pub struct Storage {
    pub cid: String,
    pub name: String,
    pub created_on: String
}

// example ipns cid (length 59)
// bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi

const DUMMY_CID: &str = "00000000000000000000000000000000000000000000000000000000000";

// example name (length 32 characters)  
const DUMMY_NAME: &str = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";

const DUMMY_CREATED_ON: &str = "0000000000000000"; // milliseconds, 16 digits
pub fn get_init_certificate() -> Storage {
    Storage{ 
        cid: String::from(DUMMY_CID),
        name: String::from(DUMMY_NAME),
        created_on: String::from(DUMMY_CREATED_ON) 
    }
}

entrypoint!(process_instruction);

pub fn process_instruction(
    program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8]
) -> ProgramResult {
    let accounts_iter = &mut accounts.iter();
    let account = next_account_info(accounts_iter)?;
    if account.owner != program_id {
        msg!("This account {} is not owned by this program {} and cannot be updated!", account.key, program_id);
    }

    sol_log_compute_units();

    let instruction_data_message = Storage::try_from_slice(instruction_data).map_err(|err| {
        msg!("Attempt to deserialize instruction data has failed. {:?}", err);
        ProgramError::InvalidInstructionData
    })?;
    msg!("Instruction_data message object {:?}", instruction_data_message);

    let data = &mut &mut account.data.borrow_mut();
    msg!("Attempting save data.");
    msg!("Instruction Length{:?}", instruction_data.len());
    data[..instruction_data.len()].copy_from_slice(&instruction_data);    
    let saved_data = Storage::try_from_slice(data)?;
    msg!("Certificate has been saved to account data. {:?}", saved_data);
    sol_log_compute_units();

    msg!("End program.");
    Ok(())
}

// Sanity tests
#[cfg(test)]
mod test {
    use super::*;
    use solana_program::clock::Epoch;
    //use std::mem;

    #[test]
    fn test_sanity() {
        let program_id = Pubkey::default();
        let key = Pubkey::default();
        let mut lamports = 0;
        let certificate = get_init_certificate(); 
        let mut data = certificate.try_to_vec().unwrap();
        let owner = Pubkey::default();
        let account = AccountInfo::new(
            &key,
            false,
            true,
            &mut lamports,
            &mut data,
            &owner,
            false,
            Epoch::default(),
        );
        
        let cid = "bafybeigjot52ohlxifpzaur5gfpcg4utccvhspygpz2pnpr7yrorrmopca";
        let created_on = "0001621449453837";
        let name = "Jane DoeXXXXXXXXXXXXXXXXXXXXXXXX";
        
        let instruction_data_certificate= Storage{ 
            cid: String::from(cid),
            name: String::from(name),
            created_on: String::from(created_on) 
        };
        let instruction_data = instruction_data_certificate.try_to_vec().unwrap();

        let accounts = vec![account];

        process_instruction(&program_id, &accounts, &instruction_data).unwrap();
        let storage = &Storage::try_from_slice(&accounts[0].data.borrow()).unwrap();
        let test_cid = &storage.cid;
        let test_created_on = &storage.created_on;
        let test_bride = &storage.name;
        println!("Storage message {:?}", &storage);

        // I added first data and expect it to contain the given data
        assert_eq!(
            String::from(cid).eq(test_cid),
            true
        );
        assert_eq!(
            String::from(created_on).eq(test_created_on),
            true
        );
        assert_eq!(
            String::from(name).eq(test_bride),
            true
        );
    }
}
