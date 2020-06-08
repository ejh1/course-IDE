import React, { useGlobal, useDispatch, useState } from 'reactn';
import './styles.scss';
import { ICourse, ICourseStudent, ICourseWS } from '@services/class-data';
import { List, Button, Form, Input, Icon, Row, Col, Switch, Typography, Popover } from 'antd';
import { Trans, TextCodes, translate } from '@components/Trans';
import TextArea from 'antd/lib/input/TextArea';
import { CourseLink } from '@components/CourseLink';

export const Course = () => {
    const addCourse = useDispatch('addCourse');
    const updateCourse = useDispatch('updateCourse');
    const deleteCourse = useDispatch('deleteCourse');
    const [{code: langCode}] = useGlobal('language');
    const [courses] = useGlobal('courses');
    const [courseStudents] = useGlobal('courseStudents');
    const [editValues, setEditValues] = useState<Partial<ICourseWS>>();
    const [newStudent, setNewStudent] = useState<Partial<ICourseStudent>>();
    const valueChanged = (key: string, e: React.ChangeEvent<HTMLInputElement>) => setEditValues({...editValues, [key]: e.target.value});
    const studentValueChanged = (key: string, e: React.ChangeEvent<HTMLInputElement>) => setNewStudent({...newStudent, [key]: e.target.value.trim()});
    const saveCourse = () => {
        const courseToSave: ICourseWS = {
            name : 'newCourse',
            description : '',
            students : [],
            ... editValues
        };
        (courseToSave.id ? updateCourse : addCourse)(courseToSave);
        setEditValues(undefined);
    }
    const deleteStudent = (email: string) => {
        setEditValues({
            ...editValues,
            students: editValues.students!.filter(student => student.email !== email)
        })
    }
    const addStudent = () => {
        // TODO - check if email already exists
        setEditValues({
            ...editValues,
            students: [...editValues.students!, {...newStudent, isActive: true} as ICourseStudent]
        });
        setNewStudent({});
    }
    const isNewStudentValid = () => {
        const {name, email} = newStudent;
        return name && email && !editValues.students!.some(student => student.email === email);
    }
    const updateStudent = (email: string, key: string, value: any) => {
        setEditValues({
            ...editValues,
            students: editValues.students!.map(student => student.email === email ? {
                ...student,
                [key]: value
            } : student)
        });
    }
    const studentNameEdit = (email: string) => {
        const student = editValues.students!.find(student => student.email === email);
        const name = window.prompt(translate(TextCodes.name, langCode)+':', student.name);
        if (name && name !== student.name) {
            updateStudent(email, 'name', name);
        }
    }
    const editCourse = (course: Partial<ICourseWS>) => {
        setEditValues({...course, students: courseStudents[course.id] || []});
        setNewStudent({});
    }
    const cancelEdit = () => setEditValues(undefined);
    const newCourse = () => editCourse({});
    const onRemoveCourse = (course: ICourse) => {
        if (confirm(translate(TextCodes.confirm, langCode))) {
            deleteCourse(course.id);
        }
    };
    const [e, n, a] = [10, 8, 6];
    return editValues ?
    (
        <div>
            <Button icon="left" onClick={cancelEdit} shape="round" />
            <Form className="course-form">
                <Form.Item label={<Trans text={TextCodes.name} />} validateStatus={editValues.name ? '' : 'error'}>
                    <Input onChange={valueChanged.bind(null, 'name')} value={editValues.name || ''} autoFocus />
                </Form.Item>
                <Form.Item label={<Trans text={TextCodes.description} />}>
                    <TextArea onChange={valueChanged.bind(null, 'description')} value={editValues.description || ''} />
                </Form.Item>
                <Form.Item label={<Trans text={TextCodes.students} />}>
                    {
                        editValues.students.map(({email ,name, isActive}) => (
                            <Row key={email}>
                                <Col className="email-field" span={e}>
                                    {email}
                                </Col>
                                <Col span={n}>
                                    {name}
                                    <Icon type="edit" onClick={studentNameEdit.bind(null, email)}/>
                                </Col>
                                <Col span={a}>
                                    <Icon type="delete" onClick={deleteStudent.bind(null, email)} />
                                    <Switch checked={isActive} onChange={updateStudent.bind(null, email, 'isActive')} />
                                </Col>
                            </Row>
                        ))
                    }
                    <Row>
                        <Col span={e}>
                            <Input placeholder="email" value={newStudent.email} onChange={studentValueChanged.bind(null, 'email')} />
                        </Col>
                        <Col span={n}>
                            <Input placeholder={translate(TextCodes.name, langCode)} value={newStudent.name} onChange={studentValueChanged.bind(null, 'name')} />
                        </Col>
                        <Col span={a}>
                            <Button type="primary" icon="plus" onClick={addStudent} disabled={!isNewStudentValid()} />
                        </Col>
                    </Row>
                </Form.Item>
                <Form.Item>
                    <Button onClick={saveCourse} ><Trans text={TextCodes.save} /></Button>
                </Form.Item>
            </Form>
        </div>
    ) : (
        <div className="course-list">
            <List
                header={<Typography.Title level={4}><Trans text={TextCodes.courses} /></Typography.Title>}
                bordered
            >
                {courses.map((course) => (
                    <List.Item
                        key={course.id}
                        actions={[
                            <Popover content={<CourseLink code={course.code}/>}><Icon type="link" /></Popover>,
                            <span>{courseStudents[course.id]?.length || 0}<Icon type="user" /></span>,
                            <Icon type="delete" onClick={onRemoveCourse.bind(null, course)} />,
                            <Icon type="edit" onClick={editCourse.bind(null, course)}/>,
                    ]}
                    >
                        <List.Item.Meta title={course.name} description={course.description} />
                    </List.Item>
                ))}
            </List>
            <Button style={{margin:'auto', display: 'block', marginTop: '5px'}} type="primary" icon="plus" onClick={newCourse} />
        </div>
    )
}