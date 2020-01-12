import React, {useGlobal, useDispatch} from 'reactn';
import { List, Icon } from 'antd';
const { Item } = List;
import { ISnippet, SnippetType } from '@services/class-data';
import { Trans, TextCodes } from '@components/Trans';
import './styles.scss';

export const Snippets = () => {
    const [snippets] = useGlobal('snippets');
    const [studentSession] = useGlobal('studentSession');
    const [snippetToDiplay] = useGlobal('snippetToDisplay');
    const setSnippetToDisplay = useDispatch('setSnippetToDisplay');
    const _removeSnippet = useDispatch('removeSnippet');
    const toggleSessionSnippet = useDispatch('toggleSessionSnippet');
    const [session] = useGlobal('session');
    const sessionSnippets = (session && session.snippets || []).reduce((acc: Record<string, boolean>, {id}) => {
        acc[id] = true;
        return acc;
    }, {});
    const removeSnippet = (snippet: ISnippet, e: MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure?')) {
            _removeSnippet(snippet);
        }
    }
    const toggleSnippet = (snippet: ISnippet, e: MouseEvent) => {
        e.stopPropagation();
        toggleSessionSnippet(snippet);
    }
    const renderItem = (isStudent: boolean, snippet: ISnippet) => {
        const actions = !isStudent && [<Icon key="delete" onClick={removeSnippet.bind(null, snippet)} type="delete"/>];
        if (!isStudent && session) {
            actions.push(<Icon
                type={sessionSnippets[snippet.id] ? 'eye' : 'eye-invisible'}
                onClick={toggleSnippet.bind(null, snippet)}
            />)
        }
        return <Item
            key={snippet.id}
            onClick={() => setSnippetToDisplay(isStudent ? SnippetType.SESSION : SnippetType.USER, snippet.id)}
            className={(snippetToDiplay && snippet.id === snippetToDiplay.id) ? 'selected' : ''}
            actions={actions}
        >{isStudent && <><Icon type="solution"/>&nbsp;</>}{snippet.name}</Item>
    };
    const {snippets: studentSnippets = []} = studentSession || {};
    const showStudentSnippets = !!studentSnippets.length;
    const header = <Trans text={TextCodes.snippets}/>;
    return (
        <div className="snippets">
            {showStudentSnippets && (
                <List
                    header={header}
                    dataSource={studentSnippets}
                    renderItem={renderItem.bind(null, true)}
                    bordered
                />
            )}
            {(!showStudentSnippets || (snippets && !!snippets.length)) && (
                <List
                    header={!showStudentSnippets && header}
                    dataSource={snippets}
                    renderItem={renderItem.bind(null, false)}
                    bordered
                />
            )}
        </div>
    )
}