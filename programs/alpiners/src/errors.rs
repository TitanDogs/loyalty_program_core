use anchor_lang::error_code;

#[error_code]
pub enum AlpinersError {
    #[msg("Attendee needs to register first")]
    AttendeeNotRegistered,
    #[msg("Attendee is already checked in already")]
    AttendeeCheckedIn,
    #[msg("Attendee is using the wrong asset")]
    AttendeeUsingWrongAsset,
    #[msg("Event max attendees has been reached")]
    EventFull,
    #[msg("Event expired already")]
    EventExpired,
    #[msg("Event not started yet")]
    EventNotStarted,
    #[msg("Invalid previous event provided")]
    PreviousEventInvalid,
    #[msg("Not enough consumable")]
    NotEnoughConsumable,
}
