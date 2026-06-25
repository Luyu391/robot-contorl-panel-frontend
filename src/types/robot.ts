export type RobotStatus = 'idle' | 'moving' | 'executing' | 'error' | 'offline';

export type JointAngles = {
  j1: number;
  j2: number;
  j3: number;
  j4: number;
  j5: number;
  j6: number;
};

export type CartesianPose = {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
};

export type GripperState = 'open' | 'closed' | 'holding' | 'unknown';

export interface RobotState {
  status: RobotStatus;
  joints: JointAngles;
  pose: CartesianPose;
  gripper: GripperState;
  speed: number;
  lastUpdate: string;
}

export interface ActionFrame {
  id: number;
  time: number;
  joints: number[];
  io?: {
    digital_output_0?: boolean;
  };
}

export interface ActionSequence {
  frames: ActionFrame[];
}