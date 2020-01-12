import React, { useGlobal, useDispatch } from 'reactn';
import { Button, Tag, Icon, Typography } from 'antd';
const { Title } = Typography;
import { SnippetType } from '@services/class-data';
import { Trans, TextCodes } from '@components/Trans';
import './styles.scss';

export const Session = () => {
    const [session] = useGlobal('session');
    const [studentsMap] = useGlobal('sessionStudents');
    const setSnippetToDisplay = useDispatch('setSnippetToDisplay');
    const [snippetToDisplay] = useGlobal('snippetToDisplay');
    const startSession = useDispatch('startSession');
    const endSession = useDispatch('endSession');
    const students = Object.values(studentsMap || {});
    const selectedId = snippetToDisplay && snippetToDisplay.id;
    const toggleStudent = (uid: string) => {
        if (uid === selectedId) {
            setSnippetToDisplay(SnippetType.NONE);
        } else {
            setSnippetToDisplay(SnippetType.STUDENT, uid);
        }
    }
    return (
        <div>
            <Title level={4} className="session-title-bar" style={session ? {} : {textAlign:'center'}}>
                {session ? <>
                    <Trans text={TextCodes.code} />
                    :<span className="session-title-code">{session.code}</span>
                    <Button onClick={() => endSession(session.code)} icon="close-circle" shape="circle" />
                </> : <Button onClick={() => startSession()}><Trans text={TextCodes.startSession}/></Button>}
            </Title>
            <p className="session-students">
                {students.map(({uid,name}) => (
                <Tag key={uid} className="student" color={uid === selectedId ? '#108ee9' : ''} onClick={toggleStudent.bind(null, uid)}>
                    {name || uid.substr(-5)}
                    {uid === selectedId && <>&nbsp;<Icon type="eye" /></>}
                </Tag>)
                )}
            </p>
        </div>
    );
}