import React, { useGlobal, useDispatch, useState } from 'reactn';
import './styles.scss';
import { Tabs, Typography, Button, List, Switch, Icon, Modal, Form, Input, Popover } from 'antd';
import { ICourseStudent, ICourseStudentItem, SnippetType } from '@services/class-data';
import { Trans, TextCodes, translate } from '@components/Trans';
import TextArea from 'antd/lib/input/TextArea';
import { CourseLink } from '@components/CourseLink';

export const StudentCourse = () => {
    const [language] = useGlobal('language');
    const [courses] = useGlobal('studentCourses');
    const [courseItems] = useGlobal('studentCoursesItems');
    const saveStudentCourse = useDispatch('updateStudentCourse');
    const addItem = useDispatch('addStudentCourseItem');
    const updateItem = useDispatch('updateStudentCourseItem');
    const deleteItem = useDispatch('deleteStudentCourseItem');
    const displaySnippet = useDispatch('setSnippetToDisplay');
    const [courseToEdit, setCourseToEdit] = useState<ICourseStudent>();
    const [description, setDescription] = useState<string>();
    const [editItem, setEditItem] = useState<ICourseStudentItem>();
    const toggleEditCourse = (course?: ICourseStudent) => {
        setCourseToEdit(course);
        setDescription(course?.description);
    }
    const saveChanges = () => {
        saveStudentCourse({...courseToEdit, description: description.trim()});
        toggleEditCourse();
    }
    const updateItemValue = (item: ICourseStudentItem, key: keyof ICourseStudentItem, value: any) =>
        updateItem({...item, [key]: value})
    const descriptionChanged = (e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value);
    const onAddItem = (course: ICourseStudent) => addItem(course);
    const onDeleteItem = (id: string) => confirm(translate(TextCodes.confirm, language.code)) && deleteItem(id);
    const onEditItem = (item: ICourseStudentItem) => setEditItem({...item});
    const loadItemCode = (item: ICourseStudentItem) => displaySnippet(SnippetType.COURSE_ITEM, item.id);
    const onEditChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => setEditItem({...editItem, [key]: e.target.value});
    const cancelEdit = () => setEditItem(undefined);
    const saveEdit = () => {
        updateItem(editItem);
        setEditItem(undefined);
    }

    const renderCourse = (course: ICourseStudent) => {
        if (!course) {
            return null;
        }
        const items = courseItems[course.courseId];
        return <div>
            <div className="course-student-desc">
                <Typography.Title level={4}>
                    <Trans text={TextCodes.aboutMe} />
                    {!!course.code && <Popover content={<CourseLink code={course.code} />}>
                        <Icon type="link" />
                    </Popover>}
                </Typography.Title>
                <Typography.Paragraph>
                    {course.description || ''}&nbsp;
                    <Icon theme="twoTone" type="edit" onClick={toggleEditCourse.bind(null, course)} />
                </Typography.Paragraph>
            </div>
            <List className="course-item-list" bordered header={<Typography.Title level={4}><Trans text={TextCodes.myItems} /></Typography.Title>} >
                {
                    (items || []).map((item) => {
                        return (
                        <List.Item
                            key={item.id}
                            actions={[
                                <Switch checked={item.isActive} onChange={updateItemValue.bind(null, item, 'isActive')} />,
                                <Icon type="code" onClick={loadItemCode.bind(null, item)} />,
                                <Icon type="edit" onClick={onEditItem.bind(null, item)} />,
                                <Icon type="delete" onClick={onDeleteItem.bind(null, item.id)}/>
                            ]}
                        >
                            <List.Item.Meta
                                title={item.name || translate(TextCodes.newItem, language.code)}
                                description={item.description || translate(TextCodes.description, language.code)}
                            />
                        </List.Item>
                    )})
                }
            </List>
            <Button
                type="primary"
                style={{margin:'auto', display:'block', marginTop: '5px'}}
                icon="plus"
                onClick={onAddItem.bind(null, course)}
            />
            {editItem && (
                <Modal
                    onOk={saveEdit}
                    onCancel={cancelEdit}
                    okText={translate(TextCodes.save, language.code)}
                    cancelText={translate(TextCodes.cancel, language.code)}
                    visible
                >
                    <Form>
                        <Form.Item label={translate(TextCodes.name, language.code)}>
                            <Input value={editItem.name || ''} onChange={onEditChange.bind(null, 'name')} />
                        </Form.Item>
                        <Form.Item label={translate(TextCodes.description, language.code)}>
                            <TextArea value={editItem.description || ''} onChange={onEditChange.bind(null, 'description')} />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </div>
    }
    return (<>
        {
            courses.length > 1 ? (<Tabs>
            {
                courses.map((course, idx) => (
                    <Tabs.TabPane key={course.id} tab={idx}>
                        {renderCourse(course)}
                    </Tabs.TabPane>
                ))
            }
            </Tabs>) : renderCourse(courses[0])
        }
            <Modal
                onOk={saveChanges}
                onCancel={toggleEditCourse.bind(null, null)}
                okText={translate(TextCodes.save, language.code)}
                cancelText={translate(TextCodes.cancel, language.code)}
                visible={!!courseToEdit}
            >
                <Form>
                    <Form.Item label={translate(TextCodes.aboutMe, language.code)}>
                        <TextArea value={description} onChange={descriptionChanged} autoFocus />
                    </Form.Item>
                </Form>
            </Modal>
    </>)
}