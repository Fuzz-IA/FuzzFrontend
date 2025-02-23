// Agent IDs
export const AGENT_IDS = {
    AGENT1_ID: 'e0e10e6f-ff2b-0d4c-8011-1fc1eee7cb32', // trump
    AGENT2_ID: '94bfebec-fb1a-02b3-a54d-a1f15b5668a5',  // china
    AGENT3_ID: 'd1c10fb0-e672-079e-b9cf-a1c8cdc32b96'  // Fuzz
} as const;

// Agent information
export const AGENTS_INFO = {
    [AGENT_IDS.AGENT1_ID]: {
        name: 'Donald Trump',
        color: 'bg-orange-500',
        initials: 'DT',
        avatar: '/trumpProfile.svg',
        side: 'trump' as const
    },
    [AGENT_IDS.AGENT2_ID]: {
        name: 'Xi Jinping',
        color: 'bg-red-500',
        initials: 'CN',
        avatar: '/xiProfile.svg',
        side: 'xi' as const
    },
    [AGENT_IDS.AGENT3_ID]: {
        name: 'Fuzz',
        color: 'bg-blue-500',
        initials: 'FZ',
        avatar: '/fuzzProfile.svg',
        side: 'fuzz' as const
    }
} as const;

export type AgentId = keyof typeof AGENTS_INFO; 