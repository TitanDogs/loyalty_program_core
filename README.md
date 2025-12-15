# Alpiners

A Web3 Event Attendance & Loyalty Management System built on Solana.

## Overview

Alpiners is a decentralized event management platform that gamifies event attendance through NFT-based loyalty cards. Each attendee receives a unique NFT that tracks their engagement, experience points, levels, referrals, and consumable rewards. The program leverages the Metaplex Core (mpl-core) library for robust NFT management and on-chain attribute storage.

## Key Features

- **NFT-Based Attendee Identity**: Each attendee receives a persistent, soulbound NFT that represents their loyalty credentials
- **Experience & Leveling System**: Earn 200 XP per event check-in with exponential level progression
- **Consumable Rewards**: Earn consumables when leveling up that can be spent within the ecosystem
- **Consecutive Attendance Tracking**: Track streaks across linked events
- **Referral System**: Reward attendees for bringing new members to events
- **Time-Bounded Events**: Create events with configurable start/end times and capacity limits
- **Event Chaining**: Link events together to validate consecutive attendance

## Architecture

### Program Components

The program consists of six main instructions:

1. **Auth Initialization** - Set up program authentication
2. **Event Creation** - Create time-bounded events with capacity limits
3. **Collection Creation** - Initialize the NFT collection for attendee badges
4. **Attendee Registration** - Mint a loyalty NFT for new attendees
5. **Event Check-In** - Register attendance and update NFT attributes
6. **Consumable Spending** - Allow attendees to spend earned rewards

### NFT Attributes

Each attendee NFT stores the following on-chain attributes:

| Attribute                | Type   | Description                                        |
| ------------------------ | ------ | -------------------------------------------------- |
| `level`                  | u16    | Current progression level (starts at 1)            |
| `experience`             | u32    | Cumulative experience points                       |
| `consumable`             | u16    | Spendable rewards earned from leveling up          |
| `consecutive_attendance` | u16    | Consecutive events attended                        |
| `referrals`              | u16    | Number of successful referrals                     |
| `referrer`               | String | Address of the account that referred this attendee |

### Gamification Mechanics

**Experience & Leveling**:

- Each check-in awards **200 XP**
- Level-up threshold: `(next_level)² × 100`
  - Level 1 → 2: 400 XP
  - Level 2 → 3: 900 XP
  - Level 3 → 4: 1,600 XP

**Consumables**:

- Awarded when leveling up
- Amount = current level
- Can be spent through the `attendee_consume` instruction

**Referral System**:

- New attendees can specify a referrer during registration
- Referrer's NFT receives +1 referral credit when the new attendee checks into their first event

## Getting Started

### Prerequisites

- Rust 1.75+
- Solana CLI 1.18+
- Anchor Framework 0.30.0
- Node.js 18+

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd alpiners
```

2. Install dependencies:

```bash
npm install
```

3. Build the program:

```bash
anchor build
```

### Testing

Run the comprehensive test suite:

```bash
anchor test
```

The test suite covers:

- Admin authorization validation
- Event creation and capacity management
- Registration flows with and without referrers
- Check-in mechanics (valid/invalid scenarios)
- Time-based event restrictions
- Level-up and experience progression
- Consecutive attendance tracking
- Referral system validation
- Consumable spending

### Deployment

1. Configure your Solana cluster in [Anchor.toml](Anchor.toml):

```toml
[provider]
cluster = "devnet"  # or "mainnet-beta"
wallet = "~/.config/solana/id.json"
```

2. Deploy the program:

```bash
anchor deploy
```

3. Update the program ID in [lib.rs](programs/alpiners/src/lib.rs) and [Anchor.toml](Anchor.toml) with the deployed address.

## Usage

### Initialize Program

First, initialize the program authentication (admin only):

```typescript
await program.methods
  .authInit()
  .accounts({
    auth: authPda,
    admin: adminKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminKeypair])
  .rpc();
```

### Create an Event

Create a new event with capacity limits and time bounds:

```typescript
const startDate = Math.floor(Date.now() / 1000); // Current Unix timestamp
const endDate = startDate + 86400; // 24 hours later

await program.methods
  .eventCreate(
    eventSeed, // Unique identifier
    100, // Max attendees
    null, // Previous event (or Pubkey for chained events)
    new BN(startDate),
    new BN(endDate)
  )
  .accounts({
    event: eventPda,
    auth: authPda,
    admin: adminKeypair.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminKeypair])
  .rpc();
```

### Create NFT Collection

Initialize the Metaplex Core collection:

```typescript
await program.methods
  .collectionCreate()
  .accounts({
    collection: collectionPda,
    auth: authPda,
    admin: adminKeypair.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([adminKeypair])
  .rpc();
```

### Register an Attendee

Mint a loyalty NFT for a new attendee:

```typescript
await program.methods
  .attendeeRegister(null) // or referrerPubkey for referral
  .accounts({
    asset: assetPda,
    collection: collectionPda,
    auth: authPda,
    user: userKeypair.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([userKeypair])
  .rpc();
```

### Check Into an Event

Register attendance at an event:

```typescript
await program.methods
  .attendeeCheckIn(eventSeed, null) // previousSeed for consecutive attendance
  .accounts({
    event: eventPda,
    asset: assetPda,
    collection: collectionPda,
    user: userKeypair.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
  })
  .signers([userKeypair])
  .rpc();
```

### Spend Consumables

Use earned consumables:

```typescript
await program.methods
  .attendeeConsume(5) // Amount to spend
  .accounts({
    asset: assetPda,
    collection: collectionPda,
    user: userKeypair.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
  })
  .signers([userKeypair])
  .rpc();
```

## Security

### Admin Whitelist

The program includes a hardcoded admin whitelist for program initialization and event creation. Only the following address can perform admin operations:

```
CHv326keHnnfBMvNFe1TB9dqNraUnUEBDmeCZJVqLhCi
```

### NFT Freeze

Attendee NFTs include a `FreezeDelegate` plugin that prevents transfers, ensuring badges remain soulbound to the original recipient.

### Error Handling

The program includes comprehensive error handling for:

- Unauthorized operations
- Invalid event states (expired, not started, full)
- Invalid check-ins (duplicate, wrong asset, missing prerequisites)
- Insufficient consumable balance
- Invalid previous event chains

See [errors.rs](programs/alpiners/src/errors.rs) for the complete error catalog.

## Project Structure

```
alpiners/
├── programs/alpiners/
│   └── src/
│       ├── lib.rs              # Main program logic
│       ├── errors.rs           # Error definitions
│       ├── structs/            # Data structures
│       │   ├── auth.rs         # Auth account
│       │   ├── event.rs        # Event account
│       │   └── stats.rs        # Stats structure
│       └── contexts/           # Instruction contexts
│           ├── auth_init.rs
│           ├── event_create.rs
│           ├── collection_create.rs
│           ├── attendee_register.rs
│           ├── attendee_check_in.rs
│           └── attendee_consume.rs
├── tests/
│   └── index.ts                # Comprehensive test suite
├── Anchor.toml                 # Anchor configuration
└── package.json                # Node.js dependencies
```
