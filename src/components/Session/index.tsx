import React, { useGlobal, useDispatch } from 'reactn';
import { Button } from 'antd';

export const Session = () => {
    const [session] = useGlobal('session');
    const [studentsMap] = useGlobal('sessionStudents')
    const startSession = useDispatch('startSession');
    const endSession = useDispatch('endSession');
    const students = Object.values(studentsMap);
    return (
        <div>
            <p>
                {session ? <>
                    {session.code}
                    <Button onClick={() => endSession(session.code)}>End</Button>
                </> : <Button onClick={() => startSession()}>Start</Button>}
            </p>
            <p>
                {students.map(({uid,name}) => <span key={uid} className="student">{name || uid.substr(-5)}</span>)}
            </p>
        </div>
    );
}